import { GetAvgPrice, fetchWithTimeout } from "../utils/functions";

export interface Coins {
  [ticker: string]: {
    cryptocom?: string;
    [key: string]: any;
  };
}

interface CryptoComTickerData {
  t?: number;
  i?: string;
  b?: string;
  k?: string;
  a?: string;
}

interface CryptoComResponse {
  result?: {
    data?: CryptoComTickerData[];
  };
}

interface PriceData {
  getPrices: (coins: Coins) => Promise<Record<string, number>>;
}

const cryptocom: PriceData = {
  getPrices: async function (
    coins: Coins
  ): Promise<Record<string, number>> {
    // Filter only coins that have a cryptocom mapping
    const tickers_to_process = Object.keys(coins).filter(
      (ticker) => coins[ticker].cryptocom
    );

    // Map instrument_name back to local ticker
    const tickers_prepared = tickers_to_process.reduce(
      (object: Record<string, string>, ticker) => {
        object[coins[ticker].cryptocom!] = ticker;
        return object;
      },
      {}
    );

    return Promise.all(
      tickers_to_process.map((ticker) =>
        fetchWithTimeout(
          `https://api.crypto.com/exchange/v1/public/get-tickers?instrument_name=${coins[ticker].cryptocom}`
        )
      )
    )
      .then((responses) => Promise.all(responses.map((res) => res.json())))
      .then((values) => {
        return values.reduce(
          (object: Record<string, number>, price: CryptoComResponse) => {
            if (!object) object = {};

            const data = price?.result?.data?.[0];
            if (!data) return object;

            // Validate timestamp (within last 10 seconds)
            if (data.t && data.t >= Date.now() - 10000) {
              const ticker = data.i;
              if (ticker && tickers_prepared[ticker]) {
                // https://exchange-docs.crypto.com/exchange/v1/rest-api#public-get-tickers
                object[tickers_prepared[ticker]] = GetAvgPrice(
                  data.b || "0",
                  data.k || "0",
                  data.a || "0"
                );
              }
            }

            return object;
          },
          {}
        );
      })
      .catch((error) => {
        console.error("Crypto.com API error:", error);
        return {};
      });
  },
};

export default cryptocom;