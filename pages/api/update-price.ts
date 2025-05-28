// MARK: - Types & Interfaces
interface PriceData {
  high: number;
  low: number;
  lastUpdated: number;
}

interface MonthlyData {
  "2. high": string;
  "3. low": string;
}

interface AlphaVantageResponse {
  "Monthly Adjusted Time Series": {
    [key: string]: MonthlyData;
  };
}

// MARK: - Constants
const API_CONFIG = {
  baseUrl: "https://www.alphavantage.co/query",
  function: "TIME_SERIES_MONTHLY_ADJUSTED",
  symbol: "TSLA",
  monthsToAnalyze: 12
} as const;

// MARK: - Helper Functions
/**
 * Validates and extracts the API key from environment variables
 * @throws Error if API key is not defined
 * @returns The API key string
 */
import { getEnvVar } from '@/config/env';

const getApiKey = (): string => {
  return getEnvVar('NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY');
};

/**
 * Constructs the API URL with query parameters
 * @param apiKey - The Alpha Vantage API key
 * @returns Complete API URL string
 */
const buildApiUrl = (apiKey: string): string => {
  return `${API_CONFIG.baseUrl}?function=${API_CONFIG.function}&symbol=${API_CONFIG.symbol}&apikey=${apiKey}`;
};

/**
 * Extracts and validates high/low prices from time series data
 * @param timeSeries - Monthly time series data from Alpha Vantage
 * @returns Object containing arrays of high and low prices
 * @throws Error if data parsing fails
 */
const extractPrices = (timeSeries: { [key: string]: MonthlyData }) => {
  const highPrices: number[] = [];
  const lowPrices: number[] = [];

  Object.keys(timeSeries)
    .slice(0, API_CONFIG.monthsToAnalyze)
    .forEach((date) => {
      const monthData = timeSeries[date];
      const high = parseFloat(monthData["2. high"]);
      const low = parseFloat(monthData["3. low"]);

      if (!isNaN(high) && !isNaN(low) && high > 0 && low > 0 && high >= low) {
        highPrices.push(high);
        lowPrices.push(low);
      }
    });

  if (highPrices.length === 0 || lowPrices.length === 0) {
    throw new Error("Failed to parse high/low prices from API response");
  }

  return { highPrices, lowPrices };
};

// MARK: - Main Function
/**
 * Fetches and processes Tesla stock price data from Alpha Vantage API
 * Includes error handling and data validation
 * @returns Promise resolving to processed price data
 * @throws Error if API request fails or data is invalid
 */
export const fetchPriceData = async (): Promise<PriceData> => {
  try {
    // MARK: - API Request Setup
    const apiKey = getApiKey();
    console.log("Initiating API request to Alpha Vantage");

    // MARK: - Data Fetching
    const response = await fetch(buildApiUrl(apiKey), {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error! status: ${response.status}, ${await response.text()}`);
    }

    // MARK: - Data Processing
    const data = await response.json() as AlphaVantageResponse;
    const timeSeries = data["Monthly Adjusted Time Series"];

    if (!timeSeries) {
      throw new Error("Invalid API response: Missing Monthly Adjusted Time Series");
    }

    // MARK: - Price Calculation
    const { highPrices, lowPrices } = extractPrices(timeSeries);
    
    const priceData: PriceData = {
      high: Math.max(...highPrices),
      low: Math.min(...lowPrices),
      lastUpdated: Date.now()
    };

    console.log("Successfully generated new price data");
    return priceData;

  } catch (error) {
    console.error("Price data fetch error:", error instanceof Error ? error.message : String(error));
    throw new Error("Failed to fetch price data from Alpha Vantage");
  }
};
