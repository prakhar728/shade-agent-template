import Web3 from "web3";
import { fetchWithTimeout } from "../utils/functions";

export interface Coins {
  [ticker: string]: {
    chainlink?: string;
    [key: string]: any;
  };
}

interface PriceData {
  getPrices: (coins: Coins) => Promise<Record<string, number>>;
}

interface JsonRpcRequest {
  method: string;
  params: Array<{
    from: null;
    to: string;
    data: string;
  } | string>;
  id: number;
  jsonrpc: string;
}

interface JsonRpcResponse {
  result?: string;
}

const getData = (address: string): JsonRpcRequest => {
  return {
    method: "eth_call",
    params: [
      {
        from: null,
        to: address,
        data: "0x50d25bcd", // latestAnswer
      },
      "latest",
    ],
    id: 1,
    jsonrpc: "2.0",
  };
};

const web3 = new Web3();

const chainlink: PriceData = {
  getPrices: async function (coins: Coins): Promise<Record<string, number>> {
    let address_to_process = Object.keys(coins).filter(
      (address) => coins[address].chainlink
    );

    let prices: Record<string, number> = {};
    await Promise.all(
      address_to_process.map((address) =>
        (async () => {
          const res: number = await fetchWithTimeout("https://ethereum.publicnode.com", {
            method: "POST",
            body: JSON.stringify(getData(coins[address].chainlink!)),
            headers: { "Content-Type": "application/json" },
          })
            .then((resp) => resp.json())
            .then((resp: JsonRpcResponse) => {
              console.log(resp);
              return Number(web3.utils.toDecimal(resp?.result ?? "0x0"));
            })
            .catch((err) => {
              console.log("Chainlink error:", err);
              return 0;
            });

          prices[address] = res / 1e8;

        })().catch(function (error) {
          console.error(error);
        })
      )
    );

    //console.log("chainlink prices", prices)
    return prices;
  },
};

export default chainlink;