import { put, list, del } from "@vercel/blob";
import { NextApiRequest, NextApiResponse } from "next";
import type { PriceData } from "@/types/price";
import { getEnvVar } from "@/config/env";

// Constants
const MAX_STORED_IMAGES = 10;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { dataUrl, priceData }: { dataUrl: string; priceData: PriceData } =
      req.body;

    // 获取最新的图片和价格数据
    const { blobs } = await list({
      prefix: "tesla-",
      limit: 100, // Reasonable limit to prevent loading too many blobs
    });

    // Clean up old blobs if we exceed the limit
    if (blobs.length > MAX_STORED_IMAGES) {
      const blobsToDelete = blobs
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .slice(MAX_STORED_IMAGES);

      await Promise.all(
        blobsToDelete.map(async (blob) => {
          try {
            await del(blob.url);
            console.log(`Deleted old blob: ${blob.url}`);
          } catch (error) {
            console.error(`Failed to delete blob ${blob.url}:`, error);
          }
        })
      );
    }

    const latestBlob = blobs.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )[0];

    // 从文件名中提取价格数据
    const lastPriceData = latestBlob?.pathname
      ? (() => {
          try {
            const parts = latestBlob.pathname.split("-prices-");
            if (parts.length !== 2) return null;

            const priceBase64 = parts[1].split(".")[0];
            if (!priceBase64) return null;

            return JSON.parse(Buffer.from(priceBase64, "base64").toString());
          } catch (e) {
            console.error("Error parsing price data:", e);
            return null;
          }
        })()
      : null;

    // 检查价格是否变化
    const isPriceChanged =
      !lastPriceData ||
      lastPriceData.high !== priceData.high ||
      lastPriceData.low !== priceData.low;

    if (!isPriceChanged && latestBlob?.url) {
      return res.status(200).json({ url: latestBlob.url });
    }

    // 将价格数据编码到文件名中
    const priceString = Buffer.from(JSON.stringify(priceData)).toString(
      "base64",
    );

    // Convert base64 to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Upload to Vercel Blob with price data in filename
    const { url } = await put(`tesla-prices-${priceString}.png`, blob, {
      access: "public",
      token: getEnvVar('BLOB_READ_WRITE_TOKEN'),
    });

    return res.status(200).json({ url, isNewUpload: true });
  } catch (error) {
    console.error("Error uploading to blob:", error instanceof Error ? error.message : String(error));
    return res.status(500).json({ 
      error: "Failed to upload image",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
}
