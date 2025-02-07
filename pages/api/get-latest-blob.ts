import { list } from "@vercel/blob";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * API Constants
 */
const TESLA_IMAGE_PREFIX = "tesla-";

/**
 * Error Messages
 */
const ERROR_MESSAGES = {
  METHOD_NOT_ALLOWED: "Method not allowed",
  FETCH_FAILED: "Failed to fetch image",
} as const;

/**
 * Retrieves the URL of the most recently uploaded Tesla-related image from Vercel Blob storage.
 *
 * @param req - The incoming HTTP request
 * @param res - The HTTP response object
 * @returns A JSON response containing either the latest image URL or an error message
 *
 * @throws Will return a 405 status if the method is not GET
 * @throws Will return a 500 status if there's an error fetching from blob storage
 */
export default async function getLatestTeslaImage(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // MARK: - Request validation
  if (req.method !== "GET") {
    return res.status(405).json({ error: ERROR_MESSAGES.METHOD_NOT_ALLOWED });
  }

  try {
    // MARK: - Fetch blobs from storage
    const { blobs } = await list({
      prefix: TESLA_IMAGE_PREFIX,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      limit: 10,
    });

    // MARK: - Sort and extract latest image
    const sortedBlobs = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    const mostRecentImageUrl = sortedBlobs[0]?.url || null;

    // MARK: - Return response
    return res.status(200).json({ url: mostRecentImageUrl });
  } catch (error) {
    // MARK: - Error handling
    console.error("Error fetching blob:", error);
    return res.status(500).json({ error: ERROR_MESSAGES.FETCH_FAILED });
  }
}
