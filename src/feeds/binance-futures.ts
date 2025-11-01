import Binance from "binance-api-node";


export interface Coins {
  [ticker: string]: {
    binance?: string;
    [key: string]: any;
  };
}

interface PriceData {
  getPrices: (coins: Coins) => Promise<Record<string, number>>;
}

const binanceFutures: PriceData = {
  getPrices: async function (coins: Coins): Promise<Record<string, number>> {
    try {
      const client = Binance();

      let tickers_to_process = Object.keys(coins).filter(
        (ticker) => coins[ticker].binance
      );

      let tickers_prepared = tickers_to_process.reduce(
        (object: Record<string, string>, ticker) => {
          object[coins[ticker].binance!] = ticker;
          return object;
        },
        {}
      );

      const prices = await client.futuresPrices();

      let tickers = Object.keys(tickers_prepared);

      return tickers_to_process.reduce(
        (object: Record<string, number>, ticker, index) => {
          const binanceTicker = tickers[index];
          if (binanceTicker in prices) {
            object[ticker] = parseFloat(prices[binanceTicker]);
          }
          return object;
        },
        {}
      );
    } catch (error) {
      console.error(error);
      return {};
    }
  },
};

export default binanceFutures;

