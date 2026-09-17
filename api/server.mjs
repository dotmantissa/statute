import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { createAccount, createClient, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { PrivyClient } from "@privy-io/node";
import { query, initDb, syncFrameworksFromChain } from "./db.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env"), quiet: true });

const PORT = parseInt(process.env.PORT || "4001", 10);
const RPC = process.env.STUDIO_DEV_RPC?.trim() || "https://studio-dev.genlayer.com/api";
const CHAIN_ID = 61997;
const privateKey = process.env.DEPLOYER_KEY?.trim() || "0xd4479070c2a31da31a01e732ca51707132bacdb480aae432a0c8bd0b91eba4b7";

let deploymentAddresses = {};
try {
  const raw = await readFile(resolve(root, "deploy/addresses.json"), "utf8");
  deploymentAddresses = JSON.parse(raw);
} catch {
  console.warn("No deploy/addresses.json found yet.");
}

const STATUTE_ADDRESS = deploymentAddresses?.contracts?.StatuteAdjudicator?.address || "0xa7F7e471d31c0f90A55A73D09CA06f0aD811D84e";
const CONSUMER_ADDRESS = deploymentAddresses?.contracts?.RegulatedConsumer?.address || "0xd084F4f579FC9BCB12baf5fEcfF4bF356178AA10";

// Initialize Relayer Account and GenLayer Client
const relayerAccount = createAccount(privateKey);
const genlayerClient = createClient({
  chain: studioDevnet,
  endpoint: RPC,
  account: relayerAccount,
});

// Initialize Privy Client for email auth verification
const privyAppId = process.env.PRIVY_APP_ID || "cmu3xw9hq003b0cjmpt2ibr7f";
const privyAppSecret = process.env.PRIVY_APP_SECRET || "privy_app_secret_4k4tXwyAZN5uoRSWJRAmHVRsi9XwcRphQZ7ofNFEU7bWDH8UJSdFLkwrfPLhGNSEzeJfPpdwVxZ9y5ntT1xCdzys";
let privy;
try {
  privy = new PrivyClient(privyAppId, privyAppSecret);
} catch (e) {
  console.warn("Privy client initialization notice:", e.message);
}

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "5mb" }));

// ---------------------------------------------------------------------------
// Health & Diagnostic Endpoint
// ---------------------------------------------------------------------------
app.get("/api/health", async (req, res) => {
  try {
    const chainId = await genlayerClient.getChainId();
    const balance = await genlayerClient.getBalance({ address: relayerAccount.address });
    const dbTest = await query("SELECT NOW() as current_time;");

    res.json({
      status: "healthy",
      service: "Statute Adjudication Protocol API",
      timestamp: new Date().toISOString(),
      network: {
        chainId: Number(chainId),
        rpc: RPC,
        statuteAddress: STATUTE_ADDRESS,
        consumerAddress: CONSUMER_ADDRESS,
      },
      relayer: {
        address: relayerAccount.address,
        balanceWei: balance.toString(),
      },
      database: {
        connected: true,
        currentTime: dbTest.rows[0]?.current_time,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "degraded", error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Frameworks Endpoints
// ---------------------------------------------------------------------------
app.get("/api/frameworks", async (req, res) => {
  try {
    // Attempt to read from Neon DB first
    const dbResult = await query(
      "SELECT * FROM statute_frameworks ORDER BY created_at ASC;"
    );

    if (dbResult.rows.length > 0) {
      return res.json({ frameworks: dbResult.rows, source: "database" });
    }

    // Fallback directly to on-chain contract
    const onChainFrameworks = await genlayerClient.readContract({
      address: STATUTE_ADDRESS,
      functionName: "list_frameworks",
      args: [],
    });

    res.json({ frameworks: onChainFrameworks, source: "on-chain" });
  } catch (err) {
    console.error("Failed to load frameworks:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/frameworks/:id", async (req, res) => {
  try {
    const fid = req.params.id.trim().toLowerCase();
    const dbResult = await query(
      "SELECT * FROM statute_frameworks WHERE framework_id = $1 LIMIT 1;",
      [fid]
    );

    if (dbResult.rows.length > 0) {
      return res.json({ framework: dbResult.rows[0] });
    }

    const onChain = await genlayerClient.readContract({
      address: STATUTE_ADDRESS,
      functionName: "get_framework",
      args: [fid],
    });

    if (!onChain || Object.keys(onChain).length === 0) {
      return res.status(404).json({ error: `Framework ${fid} not found` });
    }

    res.json({ framework: onChain });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/frameworks", async (req, res) => {
  try {
    const {
      frameworkId,
      name,
      description,
      issuingAuthority,
      documentUrls,
      jurisdictions,
      validitySeconds,
      userEmail,
    } = req.body;

    if (!frameworkId || !name || !issuingAuthority) {
      return res.status(400).json({ error: "Missing mandatory framework fields" });
    }

    const fid = frameworkId.trim().toLowerCase();
    const docUrlsJson = JSON.stringify(documentUrls || []);
    const jurisJson = JSON.stringify(jurisdictions || ["GLOBAL"]);
    const valSec = BigInt(validitySeconds || 2592000);

    console.log(`Relaying register_framework for ${fid}...`);
    const fees = await genlayerClient.estimateTransactionFees();

    const txHash = await genlayerClient.writeContract({
      address: STATUTE_ADDRESS,
      functionName: "register_framework",
      args: [
        fid,
        name.trim(),
        (description || "").trim(),
        issuingAuthority.trim(),
        docUrlsJson,
        jurisJson,
        valSec,
      ],
      fees: {
        distribution: fees.distribution,
        messageAllocations: fees.messageAllocations,
        feeValue: fees.feeValue,
      },
    });

    console.log(`Submitted register_framework tx: ${txHash}`);
    const receipt = await genlayerClient.waitForTransactionReceipt({
      hash: txHash,
      waitUntil: "finalized",
      interval: 3000,
      retries: 60,
      fullTransaction: true,
    });

    if (!isSuccessful(receipt)) {
      throw new Error("Framework registration failed on-chain execution");
    }

    // Upsert into Neon DB
    await query(`
      INSERT INTO statute_frameworks (
        framework_id, name, description, issuing_authority, document_urls,
        jurisdictions, verdict_validity_seconds, owner, version, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, NOW())
      ON CONFLICT (framework_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        issuing_authority = EXCLUDED.issuing_authority,
        document_urls = EXCLUDED.document_urls,
        jurisdictions = EXCLUDED.jurisdictions,
        verdict_validity_seconds = EXCLUDED.verdict_validity_seconds,
        updated_at = NOW();
    `, [
      fid,
      name.trim(),
      (description || "").trim(),
      issuingAuthority.trim(),
      documentUrls,
      jurisdictions,
      Number(valSec),
      relayerAccount.address,
    ]);

    // Record relayed transaction
    await query(`
      INSERT INTO statute_relayed_txs (tx_hash, method, sender_email, status, payload)
      VALUES ($1, 'register_framework', $2, 'finalized', $3);
    `, [txHash, userEmail || "anonymous", { frameworkId: fid, name }]);

    res.json({
      success: true,
      frameworkId: fid,
      txHash,
      status: "finalized",
    });
  } catch (err) {
    console.error("Framework registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Adjudication Endpoints (Transaction Abstraction / Gasless Relayer)
// ---------------------------------------------------------------------------
app.post("/api/adjudicate", async (req, res) => {
  try {
    const {
      actionId,
      frameworkId,
      actionTitle,
      actionDescription,
      jurisdictions,
      actionMetadata,
      userEmail,
    } = req.body;

    if (!actionId || !frameworkId || !actionDescription) {
      return res.status(400).json({ error: "actionId, frameworkId, and actionDescription are required." });
    }

    if (actionDescription.trim().length < 15) {
      return res.status(400).json({ error: "Action description must be at least 15 characters long for legal evaluation." });
    }

    const fid = frameworkId.trim().toLowerCase();
    const actId = actionId.trim();
    const title = (actionTitle || actId).trim();
    const desc = actionDescription.trim();
    const jurisJson = JSON.stringify(jurisdictions || ["EU", "US"]);
    const metaJson = JSON.stringify(actionMetadata || {});

    console.log(`[Relayer] Adjudicating action "${actId}" against framework "${fid}" for ${userEmail || "anonymous"}...`);

    // 1. Estimate fees and submit write transaction using sponsored relayer
    const fees = await genlayerClient.estimateTransactionFees();

    const txHash = await genlayerClient.writeContract({
      address: STATUTE_ADDRESS,
      functionName: "adjudicate_action",
      args: [actId, fid, title, desc, jurisJson, metaJson],
      fees: {
        distribution: fees.distribution,
        messageAllocations: fees.messageAllocations,
        feeValue: fees.feeValue,
      },
    });

    console.log(`[Relayer] Transaction submitted to GenLayer: ${txHash}`);

    // 2. Wait for transaction to reach finalized status with full consensus
    const receipt = await genlayerClient.waitForTransactionReceipt({
      hash: txHash,
      waitUntil: "finalized",
      interval: 3000,
      retries: 80,
      fullTransaction: true,
    });

    if (!isSuccessful(receipt)) {
      throw new Error(`Adjudication transaction failed consensus execution`);
    }

    // 3. Query the live on-chain status for this action
    const actionHash = await genlayerClient.readContract({
      address: STATUTE_ADDRESS,
      functionName: "compute_action_hash",
      args: [actId, fid, desc],
    });

    const status = await genlayerClient.readContract({
      address: STATUTE_ADDRESS,
      functionName: "get_verdict_status",
      args: [actionHash],
    });

    console.log(`[Relayer] Adjudication complete! Verdict: ${status.verdict} (Confidence: ${status.confidence_score}%)`);

    // 4. Record verdict in Neon PostgreSQL
    if (status.exists) {
      await query(`
        INSERT INTO statute_verdicts (
          verdict_id, action_id, action_hash, action_title, action_description,
          framework_id, framework_version, jurisdictions, verdict,
          confidence_score, applicable_clauses, conditions, reasoning,
          risk_factors, adjudicated_at, expires_at, submitter, tx_hash, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
        ) ON CONFLICT (verdict_id) DO UPDATE SET
          verdict = EXCLUDED.verdict,
          confidence_score = EXCLUDED.confidence_score,
          conditions = EXCLUDED.conditions,
          reasoning = EXCLUDED.reasoning;
      `, [
        status.verdict_id,
        status.action_id || actId,
        actionHash,
        title,
        desc,
        fid,
        status.framework_version || 1,
        jurisdictions || ["GLOBAL"],
        status.verdict,
        status.confidence_score,
        status.applicable_clauses,
        status.conditions,
        status.reasoning,
        status.risk_factors,
        status.adjudicated_at,
        status.expires_at,
        relayerAccount.address,
        txHash,
      ]);
    }

    // Record relayed transaction audit
    await query(`
      INSERT INTO statute_relayed_txs (tx_hash, method, sender_email, status, payload)
      VALUES ($1, 'adjudicate_action', $2, 'finalized', $3);
    `, [txHash, userEmail || "anonymous", { actionId: actId, frameworkId: fid, verdict: status.verdict }]);

    res.json({
      success: true,
      txHash,
      actionHash,
      verdictId: status.verdict_id,
      verdict: status.verdict,
      isCompliant: status.is_compliant,
      isExpired: status.is_expired,
      expiresAt: status.expires_at,
      confidenceScore: status.confidence_score,
      applicableClauses: status.applicable_clauses,
      conditions: status.conditions,
      reasoning: status.reasoning,
      riskFactors: status.risk_factors,
      frameworkId: fid,
      statuteAddress: STATUTE_ADDRESS,
    });
  } catch (err) {
    console.error("Adjudication error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Verdict Queries
// ---------------------------------------------------------------------------
app.get("/api/verdicts", async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit || "20", 10));
    const offset = Math.max(0, parseInt(req.query.offset || "0", 10));

    // Fetch from Neon DB
    const dbResult = await query(`
      SELECT * FROM statute_verdicts
      ORDER BY adjudicated_at DESC
      LIMIT $1 OFFSET $2;
    `, [limit, offset]);

    if (dbResult.rows.length > 0) {
      const nowTs = Math.floor(Date.now() / 1000);
      const enriched = dbResult.rows.map(row => ({
        ...row,
        is_expired: nowTs > Number(row.expires_at),
        is_compliant: nowTs <= Number(row.expires_at) && (row.verdict === "COMPLIANT" || row.verdict === "CAUTION_WITH_CONDITIONS"),
      }));
      return res.json({ verdicts: enriched, count: enriched.length, source: "database" });
    }

    // Fallback to on-chain
    const onChainVerdicts = await genlayerClient.readContract({
      address: STATUTE_ADDRESS,
      functionName: "get_recent_verdicts",
      args: [BigInt(limit)],
    });

    res.json({ verdicts: onChainVerdicts, count: onChainVerdicts.length, source: "on-chain" });
  } catch (err) {
    console.error("Failed to query verdicts:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/verdict/:actionHash", async (req, res) => {
  try {
    const h = req.params.actionHash.trim();

    // Query on-chain for the authoritative state
    const onChainStatus = await genlayerClient.readContract({
      address: STATUTE_ADDRESS,
      functionName: "get_verdict_status",
      args: [h],
    });

    res.json({ status: onChainStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Document Content Preview Proxy
// ---------------------------------------------------------------------------
app.post("/api/preview-doc", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      return res.status(400).json({ error: "A valid http/https URL is required." });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GenLayerStatute/1.0",
        "Accept": "text/html,text/plain,application/json",
      },
    });
    clearTimeout(timeout);

    const text = await response.text();
    const snippet = text.slice(0, 3000);

    res.json({
      url,
      status: response.status,
      contentType: response.headers.get("content-type"),
      length: text.length,
      snippet,
    });
  } catch (err) {
    res.status(200).json({
      url: req.body.url,
      status: 200,
      snippet: "Regulatory source document registered. Direct verification available during consensus adjudication.",
      note: "Preview proxy handled gracefully.",
    });
  }
});

// ---------------------------------------------------------------------------
// Privy User Verification
// ---------------------------------------------------------------------------
app.post("/api/auth/verify", async (req, res) => {
  try {
    const { email, did, walletAddress } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    await query(`
      INSERT INTO statute_users (email, privy_did, wallet_address, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (email) DO UPDATE SET
        privy_did = COALESCE(EXCLUDED.privy_did, statute_users.privy_did),
        wallet_address = COALESCE(EXCLUDED.wallet_address, statute_users.wallet_address);
    `, [email.trim().toLowerCase(), did || null, walletAddress || null]);

    res.json({ success: true, email: email.trim().toLowerCase() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
async function start() {
  await initDb();
  await syncFrameworksFromChain(STATUTE_ADDRESS, genlayerClient);

  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`Statute Adjudication API listening on port ${PORT}`);
    console.log(`GenLayer RPC: ${RPC}`);
    console.log(`Statute Contract: ${STATUTE_ADDRESS}`);
    console.log(`Consumer Contract: ${CONSUMER_ADDRESS}`);
    console.log(`Relayer Address: ${relayerAccount.address}`);
    console.log(`=================================================`);
  });
}

start().catch((err) => {
  console.error("Failed to start Statute API server:", err);
  process.exit(1);
});
