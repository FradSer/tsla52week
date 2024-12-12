interface PriceData {
  high: number;
  low: number;
  lastUpdated: number;
}

export const fetchPriceData = async (): Promise<PriceData> => {
  try {
    console.log("Invoking fetchPriceData..."); // 1. Log function invocation

    console.log("Fetching data from API...");

    const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      console.error("Missing API key."); // 4. Log missing API key
      throw new Error("API key is not defined.");
    }

    // 调用远程 API 获取数据
    console.log("Sending request to external API...");
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=TSLA&apikey=${apiKey}`,
      {
        headers: { Accept: "application/json" },
      },
    );

    console.log(`API response status: ${response.status}`); // 5. Log API response status

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("API response data received:", data); // 5. Log raw API response data for debugging

    const timeSeries = data["Monthly Adjusted Time Series"];

    // 如果远程 API 数据无效
    if (!timeSeries) {
      console.error(
        "Invalid API response structure: Missing Monthly Adjusted Time Series.",
      ); // 6. Log API response issue
      throw new Error(
        "Invalid API response structure: Missing Monthly Adjusted Time Series.",
      );
    }

    // 解析最近12个月的数据
    const highPrices: number[] = [];
    const lowPrices: number[] = [];
    console.log("Parsing high/low prices from API response..."); // 6. Log parsing operation

    Object.keys(timeSeries)
      .slice(0, 12) // 最近12个月
      .forEach((date) => {
        const monthData = timeSeries[date];
        const high = parseFloat(monthData["2. high"]);
        const low = parseFloat(monthData["3. low"]);

        if (!isNaN(high) && !isNaN(low)) {
          highPrices.push(high);
          lowPrices.push(low);
        }
      });

    console.log("Parsed high prices:", highPrices); // Log parsed high prices
    console.log("Parsed low prices:", lowPrices); // Log parsed low prices

    // 如果价格解析失败，则抛出错误
    if (highPrices.length === 0 || lowPrices.length === 0) {
      console.error("Failed to parse high/low prices from API response."); // 6. Log parsing failure
      throw new Error("Failed to parse high/low prices from API response.");
    }

    // 生成价格数据
    const priceData: PriceData = {
      high: Math.max(...highPrices),
      low: Math.min(...lowPrices),
      lastUpdated: Date.now(),
    };

    console.log("Generated new price data:", priceData); // Log new price data

    console.log("Successfully updated KV with new price data."); // 7. Log KV set success

    return priceData; // 返回数据
  } catch (error) {
    console.error("Error fetching data:", error); // 8. Log main catch error

    throw error;
  }
};
