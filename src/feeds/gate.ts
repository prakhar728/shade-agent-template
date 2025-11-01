import { GetAvgPrice, fetchWithTimeout } from "../utils/functions";

export interface Coins {
  [ticker: string]: {
    gate?: string;
    [key: string]: any;
  };
}

interface GateResponse {
  result?: string;
  highestBid?: string;
  lowestAsk?: string;
  last?: string;
}

interface PriceData {
  getPrices: (coins: Coins) => Promise<Record<string, number>>;
}

const gate: PriceData = {
  getPrices: async function (coins: Coins): Promise<Record<string, number>> {
    let tickers_to_process = Object.keys(coins).filter(
      (ticker) => coins[ticker].gate
    );

    return Promise.all(
      tickers_to_process.map((ticker) =>
        fetchWithTimeout(
          `https://data.gateapi.io/api2/1/ticker/${coins[ticker].gate}`
        )
      )
    )
      .then((responses) => Promise.all(responses.map((res) => res.json())))
      .then((values) => {
        return values.reduce(
          (object: Record<string, number>, price: GateResponse, index) => {
            if (price.result === "true") {
              object[tickers_to_process[index]] = GetAvgPrice(
                price.highestBid || "0",
                price.lowestAsk || "0",
                price.last || "0"
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

export default gate;
