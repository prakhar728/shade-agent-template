import { CoinGeckoClient } from "coingecko-api-v3";

export interface Coins {
  [ticker: string]: {
    coingecko?: string;
    [key: string]: any;
  };
}

interface PriceData {
  getPrices: (coins: Coins) => Promise<Record<string, number>>;
}

const coingecko: PriceData = {
  getPrices: async function (coins: Coins): Promise<Record<string, number>> {
    try {
      const tickers = Object.keys(coins);

      const client = new CoinGeckoClient({
        timeout: 5000,
        autoRetry: false,
      });

      let prices = await client.simplePrice({
        ids: tickers.map((ticker) => coins[ticker].coingecko).join(","),
        vs_currencies: "usd",
      });

      return tickers.reduce((object: Record<string, number>, ticker) => {
        const coingeckoTicker = coins[ticker].coingecko;
        if (coingeckoTicker) {
          object[ticker] = parseFloat(String(prices[coingeckoTicker]?.usd || "0"));
        }
        return object;
      }, {});
    } catch (error) {
      console.error(error);
      return {};
    }
  },
};

export default coingecko;
