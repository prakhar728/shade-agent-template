// AbortController is available in Node.js 15+ and browsers
if (typeof AbortController === 'undefined') {
  const { AbortController } = require("node-abort-controller");
  (global as any).AbortController = AbortController;
}

import config = require("../config");
import * as fs from "fs";
import * as path from "path";

export interface Price {
  multiplier: number;
  decimals: number;
}

export interface PriceComparison {
  multiplier: number;
  decimals: number;
}

export function IsDifferentEnough(
  relativeDiff: number,
  price_old: PriceComparison,
  price_new: PriceComparison
): boolean {
  const max_decimals = Math.max(price_new.decimals, price_old.decimals);
  const old_multiplier =
    price_old.multiplier *
    (price_old.decimals < price_new.decimals
      ? Math.pow(10, max_decimals - price_old.decimals)
      : 1);
  const new_multiplier =
    price_new.multiplier *
    (price_new.decimals < price_old.decimals
      ? Math.pow(10, max_decimals - price_new.decimals)
      : 1);

  return (
    Math.abs(new_multiplier - old_multiplier) >= old_multiplier * relativeDiff
  );
}

export function GetAvgPrice(
  bid: string | number,
  ask: string | number,
  last: string | number
): number {
  bid = parseFloat(bid as string);
  ask = parseFloat(ask as string);
  last = parseFloat(last as string);

  if (!(bid * ask) || bid > ask || ask < bid) {
    return 0;
  }

  if (last <= bid) {
    return bid;
  }
  if (last >= ask) {
    return ask;
  }

  return last;
}

export function GetMedianPrice(
  data: Array<Record<string, number | null | undefined>>,
  ticker: string
): number {
  let values = data.reduce((object: number[], prices) => {
    if (prices?.hasOwnProperty(ticker)) {
      const price = prices[ticker];
      if (typeof price === "number") {
        object.push(price);
      }
    }
    return object;
  }, []);

  if (config.PRINT_DEBUG) {
    const textPrices = values
      .map((price) => (price ? price.toFixed(4) : String(price)))
      .join(" ");
    console.debug(`DEBUG: ${ticker} prices: ${textPrices}`);
  }

  if (!values.length) return 0;

  values.sort((a, b) => a - b);

  let half = Math.floor(values.length / 2);

  if (values.length % 2) return values[half];

  return (values[half - 1] + values[half]) / 2.0;
}

export function LoadJson(
  filename: string,
  ignoreError: boolean = true
): any | null {
  try {
    let rawData = fs.readFileSync(filename);
    return JSON.parse(rawData.toString());
  } catch (e) {
    if (!ignoreError) {
      console.error("Failed to load JSON:", filename, e);
    }
  }
  return null;
}

export function SaveJson(json: any, filename: string): void {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(filename);
    if (dir && dir !== '.' && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = JSON.stringify(json);
    fs.writeFileSync(filename, data);
  } catch (e) {
    console.error("Failed to save JSON:", filename, e);
  }
}

export async function fetchWithTimeout(
  resource: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 5000, ...fetchOptions } = options;

  const controller = new AbortController();
  try {
    const id = setTimeout(() => {
      console.log(`!!!Abort on Fetch Timeout: ${resource}`);
      controller.abort();
    }, timeout);
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    if (!controller.signal.aborted) {
      console.log(err);
    }
    return Promise.reject("fetchWithTimeout rejected");
  }
}

