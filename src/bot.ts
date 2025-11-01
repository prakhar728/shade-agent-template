import near from "./utils/near";
import config from "./config";
import { IsDifferentEnough, Price, PriceComparison } from "./utils/functions";
import * as pjson from "../package.json";

interface State {
  lastFullUpdateTimestamp: number;
  lastVersionReportTimestamp: number;
}

interface BotModule {
  updatePrices: (
    relativeDiffs: Record<string, number>,
    old_prices: Record<string, PriceComparison>,
    new_prices: Record<string, Price | null>,
    state: State,
    liveAssets: Set<string>
  ) => Promise<void>;
}

interface OraclePriceUpdate {
  asset_id: string;
  price: {
    multiplier: string;
    decimals: number;
  };
}

const bot: BotModule = {
  updatePrices: async (
    relativeDiffs: Record<string, number>,
    old_prices: Record<string, PriceComparison>,
    new_prices: Record<string, Price | null>,
    state: State,
    liveAssets: Set<string>
  ): Promise<void> => {
    const current_time = Date.now();
    let prices_to_update: OraclePriceUpdate[] = [];
    const all_prices_updates: OraclePriceUpdate[] = [];

    for (const [ticker, relativeDiff] of Object.entries(relativeDiffs)) {
      const old_price = old_prices[ticker];
      const new_price = new_prices[ticker] || { multiplier: 0, decimals: 0 };

      console.log(
        `Compare ${ticker}: ${old_price.multiplier.toString()} and ${new_price.multiplier.toString()}`
      );

      if (liveAssets && !liveAssets.has(ticker)) {
        console.log(`!!! ${ticker} is not whitelisted. Skipping`);
        continue;
      }

      if (new_price.multiplier > 0) {
        const price_update: OraclePriceUpdate = {
          asset_id: ticker,
          price: {
            multiplier: Math.round(new_price.multiplier).toString(),
            decimals: new_price.decimals,
          },
        };
        all_prices_updates.push(price_update);

        if (IsDifferentEnough(relativeDiff, old_price, new_price)) {
          console.log(`!!! Update ${ticker} price`);
          prices_to_update.push(price_update);
        }
      }
    }

    // Handle full update period
    if (
      state.lastFullUpdateTimestamp + config.FULL_UPDATE_PERIOD <=
      current_time
    ) {
      prices_to_update = all_prices_updates;
      state.lastFullUpdateTimestamp = current_time;
      console.log("!!! Executing full price update");
    }

    const txParameters: Record<string, any> = {
      prices: prices_to_update,
    };

    // Report version if needed
    if (
      pjson?.version &&
      prices_to_update.length &&
      state.lastVersionReportTimestamp + config.VERSION_REPORT_PERIOD <=
        current_time
    ) {
      state.lastVersionReportTimestamp = current_time;
      txParameters.version = pjson.version;
      console.log(`!!! Reporting version of the bot: ${pjson.version}`);
    }

    // Check account balance
    const currentBalance =
      Number(await near.CurrentBalance(config.NEAR_ACCOUNT_ID)) / 1e24;
    if (currentBalance < config.MIN_CLAIM_NEAR_BALANCE) {
      console.log(
        `!!! Current balance ${currentBalance} is less than ${config.MIN_CLAIM_NEAR_BALANCE}. Claiming NEAR`
      );
      txParameters.claim_near = true;
    }

    // Report prices if needed
    if (prices_to_update.length || !!txParameters.version) {

      console.log(
        config.NEAR_ACCOUNT_ID,
        config.CONTRACT_ID,
        "report_prices",
        txParameters
      );
      
      await near.NearCall(
        config.NEAR_ACCOUNT_ID,
        config.CONTRACT_ID,
        "report_prices",
        txParameters
      );
    }
  },
};

export default bot;
