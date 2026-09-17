import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { query, initDb } from "../api/db.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env") });

async function runVerification() {
  console.log("=== STATUTE PROTOCOL FULL STACK VERIFICATION ===");

  // 1. Verify Deployment Addresses
  console.log("\n1. Verifying Deployment Addresses...");
  const rawAddr = await readFile(resolve(root, "deploy/addresses.json"), "utf8");
  const addresses = JSON.parse(rawAddr);
  const statuteAddr = addresses.contracts.StatuteAdjudicator.address;
  const consumerAddr = addresses.contracts.RegulatedConsumer.address;
  console.log(`   StatuteAdjudicator: ${statuteAddr}`);
  console.log(`   RegulatedConsumer:  ${consumerAddr}`);

  // 2. Verify GenLayer RPC
  console.log("\n2. Verifying GenLayer Studio Network Connection...");
  const client = createClient({
    chain: studioDevnet,
    endpoint: "https://studio-dev.genlayer.com/api",
  });
  const chainId = await client.getChainId();
  console.log(`   Connected Chain ID: ${chainId} (Expected: 61997)`);

  // 3. Verify Contract Read
  console.log("\n3. Verifying Live Contract Read Query...");
  const frameworks = await client.readContract({
    address: statuteAddr,
    functionName: "list_frameworks",
    args: [],
  });
  console.log(`   On-chain Frameworks Count: ${frameworks.length}`);
  for (const f of frameworks) {
    console.log(`     - [${f.framework_id}] ${f.name} (v${f.version})`);
  }

  // 4. Verify Neon DB
  console.log("\n4. Verifying Neon PostgreSQL Connection & Tables...");
  await initDb();
  const dbFrameworks = await query("SELECT COUNT(*) as count FROM statute_frameworks;");
  console.log(`   Neon DB Frameworks Synced: ${dbFrameworks.rows[0].count}`);

  console.log("\n✓ ALL STACK COMPONENTS VERIFIED SUCCESSFULLY!\n");
}

runVerification().catch((err) => {
  console.error("Stack verification failed:", err);
  process.exit(1);
});
