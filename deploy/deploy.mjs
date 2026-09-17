import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createAccount, createClient, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env"), quiet: true });

const RPC = process.env.STUDIO_DEV_RPC?.trim() || "https://studio-dev.genlayer.com/api";
const CHAIN_ID = 61997;
const privateKey = process.env.DEPLOYER_KEY?.trim() || "0xd4479070c2a31da31a01e732ca51707132bacdb480aae432a0c8bd0b91eba4b7";

async function main() {
  console.log("=================================================");
  console.log("Deploying Statute to GenLayer Studio Network");
  console.log("RPC:", RPC);
  console.log("Chain ID:", CHAIN_ID);
  console.log("=================================================");

  const account = createAccount(privateKey);
  const client = createClient({ chain: studioDevnet, endpoint: RPC, account });

  const currentChainId = Number(await client.getChainId());
  console.log(`Connected with account: ${account.address} on chain ${currentChainId}`);

  const balance = await client.getBalance({ address: account.address });
  console.log(`Deployer balance: ${balance.toString()} wei`);

  // 1. Deploy StatuteAdjudicator
  console.log("\nReading contracts/StatuteAdjudicator.py...");
  const statuteSource = await readFile(resolve(root, "contracts/StatuteAdjudicator.py"), "utf8");

  console.log("Estimating fees for StatuteAdjudicator deployment...");
  const fees = await client.estimateTransactionFees();
  console.log("Estimated fee deposit:", fees.feeValue.toString(), "wei");

  console.log("Submitting StatuteAdjudicator deployment transaction...");
  const statuteTxHash = await client.deployContract({
    code: statuteSource,
    args: [30],
    fees: {
      distribution: fees.distribution,
      messageAllocations: fees.messageAllocations,
      feeValue: fees.feeValue,
    },
  });

  console.log(`StatuteAdjudicator TX Hash: ${statuteTxHash}`);
  console.log("Waiting for transaction receipt (finalized)...");

  const statuteReceipt = await client.waitForTransactionReceipt({
    hash: statuteTxHash,
    waitUntil: "finalized",
    interval: 3000,
    retries: 120,
    fullTransaction: true,
  });

  if (!isSuccessful(statuteReceipt)) {
    throw new Error(`Deployment failed: ${JSON.stringify(statuteReceipt)}`);
  }

  const statuteCandidates = [
    statuteReceipt.txDataDecoded?.contractAddress,
    statuteReceipt.contractAddress,
    statuteReceipt.recipient,
    statuteReceipt.to_address,
    statuteReceipt.to,
  ];
  const statuteAddress = statuteCandidates.find(
    (val) => typeof val === "string" && /^0x[0-9a-fA-F]{40}$/.test(val)
  );

  if (!statuteAddress) {
    throw new Error("Could not determine Statute contract address from receipt");
  }

  console.log(`>>> StatuteAdjudicator DEPLOYED AT: ${statuteAddress}`);

  // Verify Statute on-chain state
  console.log("Verifying Statute contract read calls...");
  const frameworks = await client.readContract({
    address: statuteAddress,
    functionName: "list_frameworks",
    args: [],
  });
  console.log(`Verified! ${frameworks.length} initial regulatory frameworks active.`);

  // 2. Deploy RegulatedConsumer
  console.log("\nReading contracts/RegulatedConsumer.py...");
  const consumerSource = await readFile(resolve(root, "contracts/RegulatedConsumer.py"), "utf8");

  console.log("Estimating fees for RegulatedConsumer deployment...");
  const consumerFees = await client.estimateTransactionFees();

  console.log("Submitting RegulatedConsumer deployment transaction...");
  const consumerTxHash = await client.deployContract({
    code: consumerSource,
    args: [statuteAddress],
    fees: {
      distribution: consumerFees.distribution,
      messageAllocations: consumerFees.messageAllocations,
      feeValue: consumerFees.feeValue,
    },
  });

  console.log(`RegulatedConsumer TX Hash: ${consumerTxHash}`);
  console.log("Waiting for consumer transaction receipt (finalized)...");

  const consumerReceipt = await client.waitForTransactionReceipt({
    hash: consumerTxHash,
    waitUntil: "finalized",
    interval: 3000,
    retries: 120,
    fullTransaction: true,
  });

  const consumerCandidates = [
    consumerReceipt.txDataDecoded?.contractAddress,
    consumerReceipt.contractAddress,
    consumerReceipt.recipient,
    consumerReceipt.to_address,
    consumerReceipt.to,
  ];
  const consumerAddress = consumerCandidates.find(
    (val) => typeof val === "string" && /^0x[0-9a-fA-F]{40}$/.test(val)
  );

  console.log(`>>> RegulatedConsumer DEPLOYED AT: ${consumerAddress}`);

  // Save deployed addresses
  const metadata = {
    network: "studio-dev",
    chainId: CHAIN_ID,
    rpc: RPC,
    explorer: "https://explorer-studio-dev.genlayer.com/",
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      StatuteAdjudicator: {
        address: statuteAddress,
        deploymentTx: statuteTxHash,
      },
      RegulatedConsumer: {
        address: consumerAddress,
        deploymentTx: consumerTxHash,
      },
    },
  };

  await mkdir(resolve(root, "deploy"), { recursive: true });
  await writeFile(
    resolve(root, "deploy/addresses.json"),
    JSON.stringify(metadata, null, 2),
    "utf8"
  );
  console.log("\nDeployment metadata written to deploy/addresses.json");
  console.log("=================================================");
  console.log("Deployment completed successfully!");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Deployment failed with error:", err);
  process.exit(1);
});
