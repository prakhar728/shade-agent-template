import { GetAvgPrice, fetchWithTimeout } from "../utils/functions";

export interface Coins {
  [ticker: string]: {
    kucoin?: string;
    [key: string]: any;
  };
}

interface KuCoinResponse {
  data?: {
    bestBid?: string;
    bestAsk?: string;
    price?: string;
  };
}

interface PriceData {
  getPrices: (coins: Coins) => Promise<Record<string, number>>;
}

const kucoin: PriceData = {
  getPrices: async function (coins: Coins): Promise<Record<string, number>> {
    let tickers_to_process = Object.keys(coins).filter(
      (ticker) => coins[ticker].kucoin
    );

    return Promise.all(
      tickers_to_process.map((ticker) =>
        fetchWithTimeout(
          `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${coins[ticker].kucoin}`
        )
      )
    )
      .then((responses) => Promise.all(responses.map((res) => res.json())))
      .then((values) => {
        return values.reduce(
          (object: Record<string, number>, price: KuCoinResponse, index) => {
            if (price.data) {
              object[tickers_to_process[index]] = GetAvgPrice(
                price.data.bestBid || "0",
                price.data.bestAsk || "0",
                price.data.price || "0"
              );
            }
            return object;
          },
          {}
        );
      })
      .catch(function (error) {
        console.error(error);
        return {};
      });
  },
};

export default kucoin;