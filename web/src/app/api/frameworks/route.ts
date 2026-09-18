import { NextResponse } from "next/server";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const RPC = process.env.STUDIO_DEV_RPC || "https://studio-dev.genlayer.com/api";
const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xf94eef71c96D311ff7Ad0bd35873FD5A27ED57b2") as `0x${string}`;

export async function GET() {
  try {
    const client = createClient({
      chain: studioDevnet,
      endpoint: RPC,
    });

    const frameworks: any = await client.readContract({
      address: STATUTE_ADDRESS,
      functionName: "list_frameworks",
      args: [],
    });

    return NextResponse.json({
      frameworks: Array.isArray(frameworks) ? frameworks : [],
      source: "genlayer_contract",
      statuteAddress: STATUTE_ADDRESS,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to query frameworks from GenLayer validators" },
      { status: 500 }
    );
  }
}

export { POST } from "./register/route";
