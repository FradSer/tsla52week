import { list } from "@vercel/blob";
import { ImageResponse } from "@vercel/og";
import { NextApiRequest, NextApiResponse } from "next";
import Image from "next/image";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let url = null;

  try {
    const { blobs } = await list({
      prefix: "tesla-",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const latestBlob = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )[0];

    url = latestBlob?.url || null;
  } catch (error) {
    console.error("Error fetching blob:", error);
    return res.status(500).json({ error: "Failed to fetch image" });
  }

  if (!url) {
    return new ImageResponse(<>Image not found.</>, {
      width: 1200,
      height: 630,
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "white",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image width={900} height={900} src={url} alt="Tesla stock price chart" />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
