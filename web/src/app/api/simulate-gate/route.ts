import { NextRequest, NextResponse } from "next/server";
import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const RPC = process.env.STUDIO_DEV_RPC || "https://studio-dev.genlayer.com/api";
const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xa7F7e471d31c0f90A55A73D09CA06f0aD811D84e") as `0x${string}`;
const CONSUMER_ADDRESS = (process.env.NEXT_PUBLIC_CONSUMER_ADDRESS ||
  "0xd084F4f579FC9BCB12baf5fEcfF4bF356178AA10") as `0x${string}`;

export async function POST(req: NextRequest) {
  try {
    const { actionHash } = await req.json();
    if (!actionHash) {
      return NextResponse.json({ error: "actionHash is required" }, { status: 400 });
    }

    const client = createClient({
      chain: studioDevnet,
      endpoint: RPC,
    });

    const isCompliant: any = await client.readContract({
      address: STATUTE_ADDRESS,
      functionName: "is_action_compliant",
      args: [actionHash.trim()],
    });

    const isExecuted: any = await client.readContract({
      address: CONSUMER_ADDRESS,
      functionName: "is_action_executed",
      args: [actionHash.trim()],
    });

    return NextResponse.json({
      actionHash: actionHash.trim(),
      isCompliant: Boolean(isCompliant),
      isExecuted: Boolean(isExecuted),
      statuteAddress: STATUTE_ADDRESS,
      consumerAddress: CONSUMER_ADDRESS,
      simulation: Boolean(isCompliant)
        ? {
            status: "success",
            message:
              "TRANSACTION SUCCEEDED: RegulatedConsumer verified compliance on-chain. Action execution permitted.",
          }
        : {
            status: "reverted",
            message:
              "TRANSACTION REVERTED: RegulatedConsumer verified compliance on-chain -> False. Execution halted: [EXPECTED] Regulatory compliance verification failed on Statute.",
          },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to simulate gating on-chain" },
      { status: 500 }
    );
  }
}
