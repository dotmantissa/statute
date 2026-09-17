import { execFile } from "child_process";
import { promisify } from "util";
import { config } from "dotenv";

config({ path: ".env" });

const execFileAsync = promisify(execFile);

const NEON_CONNECTION_STRING = process.env.DATABASE_URL || "";
function getNeonSqlUrl() {
  if (!NEON_CONNECTION_STRING) return "";
  try {
    const parsed = new URL(NEON_CONNECTION_STRING);
    return `https://${parsed.hostname}/sql`;
  } catch {
    return "";
  }
}
const NEON_SQL_URL = process.env.NEON_SQL_URL || getNeonSqlUrl();

/**
 * Execute parameterized query against Neon PostgreSQL over HTTPS.
 * Highly resilient, zero-timeout, rock-solid across container environments.
 */
export async function query(sql, params = []) {
  const payload = JSON.stringify({
    query: sql,
    params: params.map((p) => {
      if (typeof p === "object" && p !== null) {
        return JSON.stringify(p);
      }
      return p;
    }),
  });

  const { stdout, stderr } = await execFileAsync("curl", [
    "-s",
    "-X",
    "POST",
    NEON_SQL_URL,
    "-H",
    `Neon-Connection-String: ${NEON_CONNECTION_STRING}`,
    "-H",
    "Content-Type: application/json",
    "-d",
    payload,
  ], { maxBuffer: 10 * 1024 * 1024 });

  if (!stdout) {
    throw new Error(`Neon SQL empty response: ${stderr}`);
  }

  let data;
  try {
    data = JSON.parse(stdout);
  } catch (err) {
    throw new Error(`Failed to parse Neon response (${err.message}): ${stdout.slice(0, 300)}`);
  }

  if (data.message && data.code) {
    throw new Error(`Neon DB error: ${data.message}`);
  }

  return {
    rows: data.rows || [],
    rowCount: data.rowCount || 0,
    fields: data.fields || [],
  };
}

export async function initDb() {
  console.log("Initializing Neon PostgreSQL tables for Statute...");

  await query(`
    CREATE TABLE IF NOT EXISTS statute_frameworks (
      framework_id VARCHAR(64) PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      issuing_authority TEXT,
      document_urls JSONB NOT NULL,
      jurisdictions JSONB NOT NULL,
      verdict_validity_seconds INTEGER NOT NULL,
      owner VARCHAR(42) NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS statute_verdicts (
      verdict_id VARCHAR(128) PRIMARY KEY,
      action_id VARCHAR(128) NOT NULL,
      action_hash VARCHAR(66) NOT NULL,
      action_title TEXT NOT NULL,
      action_description TEXT NOT NULL,
      framework_id VARCHAR(64) NOT NULL,
      framework_version INTEGER NOT NULL DEFAULT 1,
      jurisdictions JSONB NOT NULL,
      verdict VARCHAR(32) NOT NULL,
      confidence_score INTEGER NOT NULL,
      applicable_clauses JSONB NOT NULL,
      conditions JSONB NOT NULL,
      reasoning TEXT NOT NULL,
      risk_factors JSONB NOT NULL,
      adjudicated_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      submitter VARCHAR(42) NOT NULL,
      tx_hash VARCHAR(66),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_statute_verdicts_action_hash ON statute_verdicts (action_hash);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_statute_verdicts_framework_id ON statute_verdicts (framework_id);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_statute_verdicts_adjudicated_at ON statute_verdicts (adjudicated_at DESC);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS statute_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      privy_did VARCHAR(255),
      wallet_address VARCHAR(42),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS statute_relayed_txs (
      id SERIAL PRIMARY KEY,
      tx_hash VARCHAR(66) UNIQUE NOT NULL,
      method VARCHAR(64) NOT NULL,
      sender_email VARCHAR(255),
      status VARCHAR(32) NOT NULL,
      payload JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  console.log("Neon DB tables initialized and indexes created!");
}

export async function syncFrameworksFromChain(statuteAddress, client) {
  try {
    const frameworks = await client.readContract({
      address: statuteAddress,
      functionName: "list_frameworks",
      args: [],
    });

    for (const f of frameworks) {
      await query(`
        INSERT INTO statute_frameworks (
          framework_id, name, description, issuing_authority, document_urls,
          jurisdictions, verdict_validity_seconds, owner, version, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (framework_id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          issuing_authority = EXCLUDED.issuing_authority,
          document_urls = EXCLUDED.document_urls,
          jurisdictions = EXCLUDED.jurisdictions,
          verdict_validity_seconds = EXCLUDED.verdict_validity_seconds,
          version = EXCLUDED.version,
          updated_at = NOW();
      `, [
        f.framework_id,
        f.name,
        f.description,
        f.issuing_authority,
        f.document_urls,
        f.jurisdictions,
        f.verdict_validity_seconds,
        f.owner,
        f.version,
      ]);
    }
    console.log(`Synced ${frameworks.length} frameworks to Neon PostgreSQL.`);
  } catch (err) {
    console.error("Failed to sync frameworks from chain:", err);
  }
}
