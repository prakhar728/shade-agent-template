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

const binance: PriceData = {
  getPrices: async function (coins: Coins): Promise<Record<string, number>> {
    try {
      const client = Binance();

      let tickers_to_process = Object.keys(coins).filter(
        (ticker) => coins[ticker].binance
      );

      const promises = tickers_to_process.map((ticker) =>
        client.prices({ symbol: coins[ticker].binance })
      );

      let tickers_prepared = tickers_to_process.reduce(
        (object: Record<string, string>, ticker) => {
          object[coins[ticker].binance!] = ticker;
          return object;
        },
        {}
      );

      return Promise.all(promises).then((values) => {
        return values.reduce((object: Record<string, number>, price) => {
          let ticker = Object.keys(price)[0];
          object[tickers_prepared[ticker]] = parseFloat(price[ticker]);
          return object;
        }, {});
      });
    } catch (error) {
      console.error(error);
      return {};
    }
  },
};

export default binance;
