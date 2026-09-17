import { NextResponse } from "next/server";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const RPC = process.env.STUDIO_DEV_RPC || "https://studio-dev.genlayer.com/api";
const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xa7F7e471d31c0f90A55A73D09CA06f0aD811D84e") as `0x${string}`;

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
