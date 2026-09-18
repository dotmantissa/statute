import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

export const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xf94eef71c96D311ff7Ad0bd35873FD5A27ED57b2") as `0x${string}`;

export const CONSUMER_ADDRESS = (process.env.NEXT_PUBLIC_CONSUMER_ADDRESS ||
  "0x6BC505692ebB58bAe3CaAE1B3a36054831C5d01f") as `0x${string}`;

export const STUDIO_RPC_URL = "https://studio-dev.genlayer.com/api";
export const STUDIO_CHAIN_ID = 61997;

let clientInstance: ReturnType<typeof createClient> | null = null;

export function getGenLayerClient() {
  if (!clientInstance) {
    clientInstance = createClient({
      chain: studioDevnet,
      endpoint: STUDIO_RPC_URL,
    });
  }
  return clientInstance;
}

export async function fetchLiveFrameworks() {
  try {
    const client = getGenLayerClient();
    const result = await client.readContract({
      address: STATUTE_ADDRESS,
      functionName: "list_frameworks",
      args: [],
    });
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
  } catch (err) {
    console.warn("Direct on-chain framework read fallback:", err);
  }
  return null;
}

export async function fetchLiveVerdicts(limit: number = 20) {
  try {
    const client = getGenLayerClient();
    const result = await client.readContract({
      address: STATUTE_ADDRESS,
      functionName: "get_recent_verdicts",
      args: [BigInt(limit)],
    });
    if (Array.isArray(result) && result.length > 0) {
      const nowTs = Math.floor(Date.now() / 1000);
      return result.map((item: any) => ({
        ...item,
        is_expired: nowTs > Number(item.expires_at),
        is_compliant:
          nowTs <= Number(item.expires_at) &&
          (item.verdict === "COMPLIANT" || item.verdict === "CAUTION_WITH_CONDITIONS"),
      }));
    }
  } catch (err) {
    console.warn("Direct on-chain verdicts read fallback:", err);
  }
  return null;
}

export async function queryLiveVerdictStatus(actionHash: string) {
  const client = getGenLayerClient();
  const status: any = await client.readContract({
    address: STATUTE_ADDRESS,
    functionName: "get_verdict_status",
    args: [actionHash.trim()],
  });
  return status;
}

export async function checkLiveActionCompliance(actionHash: string): Promise<boolean> {
  const client = getGenLayerClient();
  const isCompliant = await client.readContract({
    address: STATUTE_ADDRESS,
    functionName: "is_action_compliant",
    args: [actionHash.trim()],
  });
  return Boolean(isCompliant);
}

export async function computeLiveActionHash(
  actionId: string,
  frameworkId: string,
  description: string
): Promise<string> {
  const client = getGenLayerClient();
  const hash = await client.readContract({
    address: STATUTE_ADDRESS,
    functionName: "compute_action_hash",
    args: [actionId.trim(), frameworkId.trim().toLowerCase(), description.trim()],
  });
  return String(hash);
}
