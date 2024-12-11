import { kv } from "@vercel/kv";

// 配置 Edge Runtime
export const config = {
  runtime: "edge",
};

interface PriceData {
  high: number;
  low: number;
  lastUpdated: number;
}

// 默认价格数据
const DEFAULT_PRICES: PriceData = {
  high: 389.49,
  low: 138.8,
  lastUpdated: Date.now(),
};

export const fetchPriceData = async (): Promise<PriceData> => {
  try {
    const TWO_HOURS = 2 * 60 * 60 * 1000; // 2小时的毫秒数

    // 尝试从 KV 存储中获取缓存数据
    const cachedData = await kv.get<PriceData>("priceData");

    if (cachedData && Date.now() - cachedData.lastUpdated < TWO_HOURS) {
      return cachedData;
    }

    // 获取 API 密钥
    const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      console.error("Missing API key.");
      throw new Error("API key is not defined.");
    }

    // 调用远程 API
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=TSLA&apikey=${apiKey}`,
      {
        headers: { Accept: "application/json" },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const timeSeries = data["Monthly Adjusted Time Series"];

    if (!timeSeries) {
      // 如果远程 API 无效，返回默认数据并缓存
      await kv.set("priceData", DEFAULT_PRICES);
      return DEFAULT_PRICES;
    }

    // 解析最近 12 个月的数据
    const highPrices: number[] = [];
    const lowPrices: number[] = [];
    Object.keys(timeSeries)
      .slice(0, 12)
      .forEach((date) => {
        const monthData = timeSeries[date];
        const high = parseFloat(monthData["2. high"]);
        const low = parseFloat(monthData["3. low"]);

        if (!isNaN(high) && !isNaN(low)) {
          highPrices.push(high);
          lowPrices.push(low);
        }
      });

    // 如果解析失败，返回默认数据
    if (highPrices.length === 0 || lowPrices.length === 0) {
      await kv.set("priceData", DEFAULT_PRICES);
      return DEFAULT_PRICES;
    }

    // 生成最新的价格数据
    const priceData: PriceData = {
      high: Math.max(...highPrices),
      low: Math.min(...lowPrices),
      lastUpdated: Date.now(),
    };

    // 缓存价格数据
    await kv.set("priceData", priceData);

    return priceData;
  } catch (error) {
    console.error("Error fetching data:", error);

    // 如果出错，尝试返回缓存数据
    try {
      const cachedData = await kv.get<PriceData>("priceData");
      if (cachedData) {
        return cachedData;
      }
    } catch (cacheError) {
      console.error("Error retrieving cached data:", cacheError);
    }

    // 如果没有缓存数据，返回默认数据并缓存
    try {
      await kv.set("priceData", DEFAULT_PRICES);
    } catch (cacheError) {
      console.error("Failed to cache default data:", cacheError);
    }

    return DEFAULT_PRICES;
  }
};
