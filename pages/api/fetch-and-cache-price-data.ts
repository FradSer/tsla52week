import axios from 'axios';

// Initialize global cache object
if (!globalThis.priceDataCache) {
  globalThis.priceDataCache = { data: null, lastFetch: 0 };
}

// Fetch price data and store in global cache
const fetchAndCachePriceData = async () => {
  const apiKey = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=TSLA&apikey=${apiKey}`;

  try {
    const response = await axios.get(url);
    const timeSeries = response.data['Monthly Adjusted Time Series'];

    if (!timeSeries) {
      console.error('No time series data available');
      return;
    }

    // Extract 12 months of data for 52-week period
    const highPrices: number[] = [];
    const lowPrices: number[] = [];

    Object.keys(timeSeries).slice(0, 12).forEach((date) => {
      const data = timeSeries[date];
      highPrices.push(parseFloat(data['2. high']));
      lowPrices.push(parseFloat(data['3. low']));
    });

    // Calculate 52-week high and low
    const high52Week = Math.max(...highPrices);
    const low52Week = Math.min(...lowPrices);

    // Store data in global cache with timestamp
    globalThis.priceDataCache = {
      data: { high: high52Week, low: low52Week },
      lastFetch: Date.now(),
    };

    console.log('Price data cached:', globalThis.priceDataCache.data);
  } catch (error) {
    console.error('Error fetching data from Alpha Vantage:', error);
  }
};

// Set interval to fetch data every 1 hour (3600000 milliseconds)
setInterval(fetchAndCachePriceData, 3600000);

// Initial fetch to populate cache
fetchAndCachePriceData();

export const getCachedPriceData = () => globalThis.priceDataCache.data;
