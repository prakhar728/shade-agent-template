// scripts/whitelistAsset.js
const nearAPI = require("near-api-js");
const { connect, keyStores, KeyPair } = nearAPI;
const { parseSeedPhrase } = require("near-seed-phrase");

const CONTRACT_ID = "ac-sandbox.price-oracle-bot.testnet";
const NETWORK_ID = "testnet";
const NODE_URL = "https://test.rpc.fastnear.com";

const TestnetCoins = {
  "wrap.testnet": {},
  aurora: {},
  "usdt.fakes.testnet": {},
  "usdc.fakes.testnet": {},
  "dai.fakes.testnet": {},
  "wbtc.fakes.testnet": {},
  "aurora.fakes.testnet": {},
  "woo.orderly.testnet": {},
  "fraxtoken.testnet": {},
};

async function main() {
  const { NEAR_ACCOUNT_ID, NEAR_SEED_PHRASE } = process.env;

  if (!NEAR_ACCOUNT_ID || !NEAR_SEED_PHRASE) {
    console.error(
      "❌ Missing vars.\nUsage:\n NEAR_ACCOUNT_ID=<acct> NEAR_SEED_PHRASE='words...' node scripts/whitelistAsset.js"
    );
    process.exit(1);
  }

  // ✅ derive keypair from seed phrase
  const { secretKey } = parseSeedPhrase(NEAR_SEED_PHRASE);
  const keyPair = KeyPair.fromString(secretKey);

  const keyStore = new keyStores.InMemoryKeyStore();
  await keyStore.setKey(NETWORK_ID, NEAR_ACCOUNT_ID, keyPair);

  const near = await connect({ networkId: NETWORK_ID, nodeUrl: NODE_URL, deps: { keyStore } });
  const account = await near.account(NEAR_ACCOUNT_ID);
  const assets = Object.keys(TestnetCoins);

  console.log(`\n🚀 Whitelisting ${assets.length} testnet assets on ${CONTRACT_ID}\n`);

  for (const assetId of assets) {
    try {
      console.log(`➕ Adding asset: ${assetId}`);
      const res = await account.functionCall({
        contractId: CONTRACT_ID,
        methodName: "add_asset",
        args: { asset_id: assetId },
        gas: "300000000000000",
      });

      console.log(`✅ ${assetId} → Tx: ${res.transaction_outcome.id}\n`);
    } catch (e) {
      if (String(e).includes("already exists")) {
        console.log(`⚠️ ${assetId} already whitelisted\n`);
      } else {
        console.log(`❌ Error adding ${assetId}:`, e.message, "\n");
      }
    }
  }

  console.log("🎉 Done!\n");
}

main().catch((e) => console.error("Fatal:", e));
