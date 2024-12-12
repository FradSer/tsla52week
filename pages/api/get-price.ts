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
  console.log("Handler invoked"); // 1. Log handler start

  try {
    const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4小时的毫秒数

    // 直接从 KV 获取价格数据
    let priceData = await kv.get<PriceData>("priceData");
    console.log("Retrieved priceData from KV:", priceData); // 2. Log the retrieved data

    // 检查 priceData 格式和 lastUpdated 时间是否超过 4 小时
    if (
      !priceData ||
      typeof priceData.lastUpdated !== "number" ||
      Date.now() - priceData.lastUpdated > FOUR_HOURS
    ) {
      console.log("priceData is invalid or outdated. Fetching new data..."); // 4. Log invalid/outdated states

      // 使用 update-price 获取最新价格
      priceData = await fetchPriceData();
      console.log("Fetched new priceData:", priceData); // Log fetched price data

      // 更新 KV 中的价格数据
      if (
        priceData &&
        typeof priceData.high === "number" &&
        typeof priceData.low === "number"
      ) {
        await kv.set("priceData", { ...priceData, lastUpdated: Date.now() });
        console.log("Updated KV with new priceData"); // 3. Log KV update
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
    console.log("Returning default prices due to error"); // 5. Log default price handling
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
