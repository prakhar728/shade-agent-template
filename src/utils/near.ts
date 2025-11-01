// near.ts
import * as os from "os";
import * as fs from "fs";
import * as path from "path";

import { JsonRpcProvider } from "@near-js/providers";
import { Account } from "@near-js/accounts";
import { KeyPair } from "@near-js/crypto";
import { KeyPairSigner } from "@near-js/signers";
import { NEAR } from "@near-js/tokens";
import { agentCall } from "@neardefi/shade-agent-js";
import { getConfig } from "../config";

/**
 * Expect your getConfig to return at least:
 * {
 *   networkId: "mainnet" | "testnet" | string;
 *   nodeUrl: string; // e.g. https://rpc.mainnet.near.org or https://test.rpc.fastnear.com
 * }
 */
const nearConfig = getConfig(process.env.NODE_ENV || "development");

const CREDENTIALS_DIR =
  nearConfig.networkId === "mainnet"
    ? ".near-credentials/mainnet/"
    : ".near-credentials/testnet/";

/** 50 TGas by default (same as legacy) */
const GAS = "50000000000000";

export interface NearModule {
  CurrentBalance: (accountId: string) => Promise<bigint>;
  NearView: (
    contract: string,
    operation: string,
    parameters: any
  ) => Promise<any>;
  NearCall: (
    account_id: string,
    contract: string,
    operation: string,
    parameters: any
  ) => Promise<void>;
}

/**
 * Reads a local NEAR credentials JSON file and returns the private key string.
 * Compatible with files created by near-cli / wallet exports:
 * {
 *   "account_id": "name.testnet",
 *   "public_key": "ed25519:...",
 *   "private_key": "ed25519:..."
 * }
 */
const GetPrivateKey = async (account_id: string): Promise<string> => {
  const homedir = os.homedir();
  const credentialsPath = path.join(homedir, CREDENTIALS_DIR);
  const keyPath = path.join(credentialsPath, `${account_id}.json`);

  try {
    const credentialsRaw = fs.readFileSync(keyPath, "utf8");
    const credentials = JSON.parse(credentialsRaw);
    const pk = credentials?.private_key || credentials?.privateKey;
    if (!pk || typeof pk !== "string") {
      throw new Error("Missing private_key in credentials JSON");
    }
    if (!pk.startsWith("ed25519:")) {
      throw new Error("Private key must be in 'ed25519:xxxxx' format");
    }
    return pk;
  } catch (e: any) {
    throw new Error(
      `Key not found for account at ${keyPath}. Error: ${e?.message || e}`
    );
  }
};

/** Create a provider for the configured RPC endpoint. */
const makeProvider = (): JsonRpcProvider => {
  if (!nearConfig?.nodeUrl) {
    throw new Error("nearConfig.nodeUrl is not set");
  }
  return new JsonRpcProvider({ url: nearConfig.nodeUrl });
};

const near: NearModule = {
  /**
   * Returns the account's NEAR balance in yoctoNEAR (bigint).
   * Uses the new @near-js/tokens helper for clarity.
   */
  CurrentBalance: async (accountId: string): Promise<bigint> => {
    if (!accountId) throw new Error("accountId is required");

    const provider = makeProvider();
    // Read-only Account (no signer needed)
    const account = new Account(accountId, provider);

    // Returns bigint in token base units (yoctoNEAR for NEAR)
    const amount = await account.getBalance(NEAR);
    return amount;
  },

  /**
   * Read-only contract view call.
   * No signer or gas/deposit needed.
   */
  NearView: async (
    contract: string,
    operation: string,
    parameters: any
  ): Promise<any> => {
    if (!contract) throw new Error("contract is required");
    if (!operation) throw new Error("operation (method) is required");

    const provider = makeProvider();

    // Modern provider view call (returns parsed JSON from the contract)
    // Example matches docs: provider.callFunction(contractId, methodName, args)
    const result = await provider.callFunction(contract, operation, parameters ?? {});
    return result;
  },

  /**
   * Change-method contract call (requires signing).
   * Reads private key from local credentials and signs with KeyPairSigner.
   */
  NearCall: async (
    account_id: string,
    contract: string,
    operation: string,
    parameters: any
  ): Promise<void> => {
    if (!account_id) throw new Error("account_id is required");
    if (!contract) throw new Error("contract is required");
    if (!operation) throw new Error("operation (method) is required");

    try {
      // const privateKey = await GetPrivateKey(account_id);
      // Build signer from a raw secret key string
      // const signer = KeyPairSigner.fromSecretKey(privateKey as any);
      // const provider = makeProvider();
      // // Stateful Account with signer to perform transactions
      // const account = new Account(account_id, provider, signer);

      // Call change method
      const outcome = await agentCall({
        // contractId: contract,
        methodName: operation,
        args: parameters ?? {},
        // 0 NEAR deposit by default (override here if needed)
        // deposit: NEAR.toUnits("0"),
        // Gas can be string or bigint; we normalize to bigint
        // gas: BigInt(GAS),
        // Optionally control finality wait:
        // waitUntil: "FINAL",
      });

      // Best-effort log extraction (structure may vary by provider/transport)
      // const logs: string[] = [];

      // // New outcomes typically contain receipts/outcomes with logs
      // const receiptsOutcomes = (outcome as any)?.receipts_outcome ?? (outcome as any)?.receiptsOutcome;
      // if (Array.isArray(receiptsOutcomes)) {
      //   for (const ro of receiptsOutcomes) {
      //     const l = ro?.outcome?.logs;
      //     if (Array.isArray(l) && l.length) {
      //       logs.push(...l);
      //     }
      //   }
      // }

      // Some providers include top-level outcome logs as well
      // const topLogs = (outcome as any)?.outcome?.logs;
      // if (Array.isArray(topLogs) && topLogs.length) {
      //   logs.push(...topLogs);
      // }

      // if (logs.length) {
      //   console.log(`Successful operation: ${operation}\n${logs.join("\n")}`);
      // } else {
      //   console.log(`Successful operation: ${operation} (no logs)`);
      // }

      console.log("Outcome of report prices", outcome);
      
    } catch (e: any) {
      console.error(`Call processed with error: ${e?.message || e}`);
      throw e;
    }
  },
};

export default near;
