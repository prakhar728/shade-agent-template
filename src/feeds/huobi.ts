import { fetchWithTimeout } from "../utils/functions";

export interface Coins {
  [ticker: string]: {
    huobi?: string;
    [key: string]: any;
  };
}

interface HuobiResponse {
  tick?: {
    bid?: number[];
    ask?: number[];
  };
}

interface PriceData {
  getPrices: (coins: Coins) => Promise<Record<string, number>>;
}

const huobi: PriceData = {
  getPrices: async function (coins: Coins): Promise<Record<string, number>> {
    let tickers_to_process = Object.keys(coins).filter(
      (ticker) => coins[ticker].huobi
    );

    let prices: Record<string, number> = {};
    await Promise.all(
      tickers_to_process.map((ticker) =>
        (async () => {
          let res = await fetchWithTimeout(
            `https://api.huobi.pro/market/detail/merged?symbol=${coins[ticker].huobi}`
          );
          res = await res.json();
          const jsonRes = res as HuobiResponse;
          if (jsonRes?.tick?.bid?.[0] && jsonRes?.tick?.ask?.[0]) {
            prices[ticker] =
              (jsonRes.tick.bid[0] + jsonRes.tick.ask[0]) / 2;
          }
        })().catch(function (error) {
          console.error(error);
        })
      )
    );
    return prices;
  },
};


export default huobi;