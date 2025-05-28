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
  if (
    data === null ||
    typeof data !== "object" ||
    !("high" in data) ||
    !("low" in data) ||
    !("lastUpdated" in data)
  ) {
    return false;
  }

  const { high, low, lastUpdated } = data as Record<string, unknown>;
  
  return (
    typeof high === "number" &&
    typeof low === "number" &&
    typeof lastUpdated === "number" &&
    high > 0 &&
    low > 0 &&
    high >= low &&
    lastUpdated > 0 &&
    lastUpdated <= Date.now()
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
          console.log("Current data invalid or stale, fetching fresh price data");
          try {
            priceData = await fetchPriceData();

            if (isPriceDataValid(priceData)) {
              await kv.set("priceData", priceData);
              console.log("Updated cache with new price data:", priceData);
            } else {
              throw new Error("Received invalid price data format from API");
            }
          } catch (error) {
            console.error("Failed to fetch or validate fresh price data:", 
              error instanceof Error ? error.message : String(error)
            );
            throw error;
          }
        }

    // MARK: - Response Generation
    return NextResponse.json(priceData, {
      headers: getCacheHeaders(),
    });
  } catch (error) {
    // MARK: - Error Handling
    console.error(
      "Price data fetch error:",
      error instanceof Error ? error.message : String(error)
    );
    const fallbackData = {
      ...DEFAULT_PRICE_DATA,
      lastUpdated: Date.now(),
    };
    return NextResponse.json(
      {
        ...fallbackData,
        error: "Failed to fetch price data, using fallback values",
      },
      {
        headers: {
          ...getCacheHeaders(),
          "X-Error-Details": error instanceof Error ? error.message : "Unknown error",
        },
      }
    );
  }
}
