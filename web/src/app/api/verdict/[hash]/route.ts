import { NextRequest, NextResponse } from "next/server";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const RPC = process.env.STUDIO_DEV_RPC || "https://studio-dev.genlayer.com/api";
const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xf94eef71c96D311ff7Ad0bd35873FD5A27ED57b2") as `0x${string}`;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;
    if (!hash) {
      return NextResponse.json({ error: "Action hash required" }, { status: 400 });
    }

    const client = createClient({
      chain: studioDevnet,
      endpoint: RPC,
    });

    const status: any = await client.readContract({
      address: STATUTE_ADDRESS,
      functionName: "get_verdict_status",
      args: [hash.trim()],
    });

    return NextResponse.json({
      status,
      source: "genlayer_contract",
      statuteAddress: STATUTE_ADDRESS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to query verdict status" },
      { status: 500 }
    );
  }
}
