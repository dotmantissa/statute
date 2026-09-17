import { NextRequest, NextResponse } from "next/server";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const RPC = process.env.STUDIO_DEV_RPC || "https://studio-dev.genlayer.com/api";
const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xa7F7e471d31c0f90A55A73D09CA06f0aD811D84e") as `0x${string}`;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "30", 10));

    const client = createClient({
      chain: studioDevnet,
      endpoint: RPC,
    });

    const verdicts: any = await client.readContract({
      address: STATUTE_ADDRESS,
      functionName: "get_recent_verdicts",
      args: [BigInt(limit)],
    });

    const nowTs = Math.floor(Date.now() / 1000);
    const formatted = Array.isArray(verdicts)
      ? verdicts.map((item: any) => ({
          ...item,
          is_expired: nowTs > Number(item.expires_at),
          is_compliant:
            nowTs <= Number(item.expires_at) &&
            (item.verdict === "COMPLIANT" || item.verdict === "CAUTION_WITH_CONDITIONS"),
        }))
      : [];

    return NextResponse.json({
      verdicts: formatted,
      source: "genlayer_contract",
      count: formatted.length,
      statuteAddress: STATUTE_ADDRESS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to query verdicts from GenLayer validators" },
      { status: 500 }
    );
  }
}
