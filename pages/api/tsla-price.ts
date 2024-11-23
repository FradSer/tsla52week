import { NextResponse } from 'next/server'
import { fetchPriceData } from "./fetch-and-cache-price-data";

export const config = {
  runtime: "edge",
};

// Cache the response for 1 hour
export const runtime = 'edge'
export const revalidate = 3600 // revalidate every hour

export default async function handler() {
  const priceData = await fetchPriceData();

  if (!priceData) {
    return NextResponse.json({ error: "Data not available" }, { status: 503 });
  }

  // Set cache headers
  const response = NextResponse.json(priceData);
  response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
  
  return response;
}
