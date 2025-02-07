import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { fetchPriceData } from "./update-price";

// MARK: - Configuration
export const config = {
  runtime: "edge",
};

// MARK: - Types & Interfaces
interface PriceData {
  high: number;
  low: number;
  lastUpdated: number;
}

// MARK: - Constants
const CACHE_CONFIG = {
  maxAge: 7200, // 2 hours
  staleWhileRevalidate: 3600, // 1 hour
} as const;

const TIME_INTERVALS = {
  fourHours: 4 * 60 * 60 * 1000,
} as const;

const DEFAULT_PRICE_DATA: Omit<PriceData, "lastUpdated"> = {
  high: 389.49,
  low: 138.8,
};

// MARK: - Helper Functions
/**
 * Validates the structure and values of price data
 * @param data - The price data object to validate
 * @returns Boolean indicating if the data is valid
 */
const isPriceDataValid = (data: unknown): data is PriceData => {
  return (
    data !== null &&
    typeof data === "object" &&
    "high" in data &&
    "low" in data &&
    "lastUpdated" in data &&
    typeof (data as Record<string, unknown>).high === "number" &&
    typeof (data as Record<string, unknown>).low === "number" &&
    typeof (data as Record<string, unknown>).lastUpdated === "number"
  );
};

/**
 * Checks if the price data needs updating based on timestamp
 * @param timestamp - The lastUpdated timestamp to check
 * @returns Boolean indicating if an update is needed
 */
const isDataStale = (timestamp: number): boolean => {
  return Date.now() - timestamp > TIME_INTERVALS.fourHours;
};

/**
 * Creates response headers with proper caching configuration
 * @returns Object containing response headers
 */
const getCacheHeaders = () => ({
  "Cache-Control": `public, s-maxage=${CACHE_CONFIG.maxAge}, stale-while-revalidate=${CACHE_CONFIG.staleWhileRevalidate}`,
});

// MARK: - Main Handler
/**
 * Edge API handler for retrieving Tesla stock price data
 * Implements caching, data validation, and fallback mechanisms
 * @returns NextResponse containing price data or default values
 */
export default async function handler() {
  try {
    // MARK: - Data Retrieval
    let priceData = await kv.get<PriceData>("priceData");
    console.log("Retrieved price data:", priceData);

    // MARK: - Data Validation & Update
    if (!isPriceDataValid(priceData) || isDataStale(priceData.lastUpdated)) {
      console.log("Fetching fresh price data");
      priceData = await fetchPriceData();

      if (isPriceDataValid(priceData)) {
        await kv.set("priceData", priceData);
        console.log("Updated cache with new price data");
      } else {
        throw new Error("Invalid price data format received");
      }
    }

    // MARK: - Response Generation
    return NextResponse.json(priceData, {
      headers: getCacheHeaders(),
    });
  } catch (error) {
    // MARK: - Error Handling
    console.error("Price data fetch error:", error);
    return NextResponse.json(
      {
        ...DEFAULT_PRICE_DATA,
        lastUpdated: Date.now(),
      },
      {
        headers: getCacheHeaders(),
      }
    );
  }
}
