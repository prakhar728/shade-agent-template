import { Token } from "@uniswap/sdk-core";
import { ethers, formatUnits, parseUnits } from "ethers";
import { computePoolAddress, FeeAmount } from "@uniswap/v3-sdk";
import Quoter from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";

export interface Coins {
  [ticker: string]: {
    uniswapv3?: {
      tokenIn: {
        address: string;
        decimals: number;
      };
      tokenOut: {
        address: string;
        decimals: number;
      };
      fee: number;
    };
    [key: string]: any;
  };
}

interface PriceData {
  getPrices: (coins: Coins) => Promise<Record<string, number>>;
}

const POOL_FACTORY_CONTRACT_ADDRESS =
  "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const QUOTER_CONTRACT_ADDRESS = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const MAINNET_NETWORK_ID = 1;
const AMOUNT_IN = 10000;

const MAINNET_RPC = "https://ethereum.publicnode.com";

function fromReadableAmount(amount: number, decimals: number): string {
  return parseUnits(amount.toString(), decimals).toString();
}

function toReadableAmount(rawAmount: string, decimals: number): string {
  return formatUnits(rawAmount, decimals);
}

function getProvider(): any {
  return new ethers.JsonRpcProvider(MAINNET_RPC, {
    name: "mainnet",
    chainId: 1,
  });
}

async function getPoolConstantsV3(
  tokenIn: any,
  tokenOut: any,
  poolFee: number
): Promise<{ token0: string; token1: string; fee: number }> {
  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
    tokenA: tokenIn,
    tokenB: tokenOut,
    fee: poolFee,
  });

  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    getProvider()
  );
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);

  return {
    token0,
    token1,
    fee,
  };
}

async function quoteV3(
  tokenIn: any,
  tokenOut: any,
  fee: number
): Promise<string> {
  const quoterContract = new ethers.Contract(
    QUOTER_CONTRACT_ADDRESS,
    Quoter.abi,
    getProvider()
  );
  const poolConstants = await getPoolConstantsV3(tokenIn, tokenOut, fee);

  const quotedAmountOut =
    await quoterContract.quoteExactInputSingle.staticCall(
      poolConstants.token0,
      poolConstants.token1,
      poolConstants.fee,
      fromReadableAmount(AMOUNT_IN, tokenIn.decimals),
      0
    );

  return toReadableAmount(quotedAmountOut, tokenOut.decimals);
}

const uniswapv3: PriceData = {
  getPrices: async function (coins: Coins): Promise<Record<string, number>> {
    try {
      let address_to_process = Object.keys(coins).filter(
        (address) => coins[address].uniswapv3
      );

      let prices: Record<string, number> = {};
      await Promise.all(
        address_to_process.map((address) =>
          (async () => {
            let { tokenIn, tokenOut, fee } = coins[address].uniswapv3!;

            const tokenInObj = new Token(
              MAINNET_NETWORK_ID,
              tokenIn.address,
              tokenIn.decimals,
              "",
              ""
            );

            const tokenOutObj = new Token(
              MAINNET_NETWORK_ID,
              tokenOut.address,
              tokenOut.decimals,
              "",
              ""
            );

            prices[address] =
              parseFloat(await quoteV3(tokenInObj, tokenOutObj, fee)) /
              AMOUNT_IN;
          })().catch(function (error) {
            console.error(error);
          })
        )
      );

      return prices;
    } catch (error) {
      console.error(error);
      return {};
    }
  },
};

export default uniswapv3;