import { Hono } from "hono";
import { agentAccountId, agent } from "@neardefi/shade-agent-js";
import { startNearPriceOracleBot } from "../entrypoint";

const app = new Hono();

app.get("/", async (c) => {
  try {

    console.log("Starting price oracle...");
    
    startNearPriceOracleBot();

    return c.json({
      "message": "Price oracle started",
    });
  } catch (error) {
    console.log("Error getting agent account:", error);
    return c.json({ error: "Failed to get agent account " + error }, 500);
  }
});

export default app;
