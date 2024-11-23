import { list } from "@vercel/blob";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { blobs } = await list({
      prefix: "tesla-",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 获取最新的图片
    const latestBlob = blobs.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )[0];

    return res.status(200).json({ url: latestBlob?.url || null });
  } catch (error) {
    console.error("Error fetching blob:", error);
    return res.status(500).json({ error: "Failed to fetch image" });
  }
}
