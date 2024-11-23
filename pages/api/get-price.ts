import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const config = {
  runtime: "edge",
};

interface PriceData {
  high: number;
  low: number;
  lastUpdated: number;
}

// 默认价格
const DEFAULT_PRICES = {
  high: 358.64,
  low: 138.8,
};

export default async function handler() {
  try {
    // 直接从 KV 获取价格数据
    const priceData = await kv.get<PriceData>("priceData");

    // 如果没有数据，返回默认价格
    if (!priceData) {
      const defaultData = {
        ...DEFAULT_PRICES,
        lastUpdated: Date.now(),
      };

      return NextResponse.json(defaultData, {
        headers: {
          "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=3600",
        },
      });
    }

    return NextResponse.json(priceData, {
      headers: {
        "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("KV Error:", error);

    // 发生错误时返回默认价格
    return NextResponse.json(
      {
        ...DEFAULT_PRICES,
        lastUpdated: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=3600",
        },
      },
    );
  }
}
