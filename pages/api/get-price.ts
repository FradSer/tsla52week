import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { fetchPriceData } from "./update-price";

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
  high: 389.49,
  low: 138.8,
};

export default async function handler() {
  try {
    const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4小时的毫秒数

    // 直接从 KV 获取价格数据
    let priceData = await kv.get<PriceData>("priceData");

    // 检查 priceData 格式和 lastUpdated 时间是否超过 4 小时
    if (
      !priceData ||
      typeof priceData.lastUpdated !== "number" ||
      Date.now() - priceData.lastUpdated > FOUR_HOURS
    ) {
      // 使用 update-price 获取最新价格
      priceData = await fetchPriceData();

      // 更新 KV 中的价格数据
      if (
        priceData &&
        typeof priceData.high === "number" &&
        typeof priceData.low === "number"
      ) {
        await kv.set("priceData", { ...priceData, lastUpdated: Date.now() });
      } else {
        throw new Error("Invalid price data format from fetchPriceData");
      }
    }

    return NextResponse.json(priceData, {
      headers: {
        "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Handler Error:", error);

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
