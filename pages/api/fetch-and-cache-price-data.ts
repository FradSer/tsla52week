import axios from "axios";

export const fetchPriceData = async () => {
  const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=TSLA&apikey=${apiKey}`;

  try {
    const response = await axios.get(url);
    const timeSeries = response.data["Monthly Adjusted Time Series"];

    if (!timeSeries) {
      console.error("No time series data available");
      return null;
    }

    const highPrices: number[] = [];
    const lowPrices: number[] = [];

    Object.keys(timeSeries)
      .slice(0, 12)
      .forEach((date) => {
        const data = timeSeries[date];
        highPrices.push(parseFloat(data["2. high"]));
        lowPrices.push(parseFloat(data["3. low"]));
      });

    return {
      high: Math.max(...highPrices),
      low: Math.min(...lowPrices)
    };
  } catch (error) {
    console.error("Error fetching data from Alpha Vantage:", error);
    return null;
  }
};
