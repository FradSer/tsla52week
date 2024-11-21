import { NextResponse } from "next/server";
import { getCachedPriceData } from "./fetch-and-cache-price-data";

export const config = {
  runtime: "edge", // Use Edge Runtime
};

export default async function handler() {
  const priceData = getCachedPriceData();

  if (!priceData) {
    return NextResponse.json({ error: "Data not available" }, { status: 503 });
  }

  return NextResponse.json(priceData);
}
