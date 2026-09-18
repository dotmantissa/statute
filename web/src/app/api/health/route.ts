import { NextResponse } from "next/server";
import { createClient, createAccount } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const RPC = process.env.STUDIO_DEV_RPC || "https://studio-dev.genlayer.com/api";
const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xf94eef71c96D311ff7Ad0bd35873FD5A27ED57b2") as `0x${string}`;
const CONSUMER_ADDRESS = (process.env.NEXT_PUBLIC_CONSUMER_ADDRESS ||
  "0x6BC505692ebB58bAe3CaAE1B3a36054831C5d01f") as `0x${string}`;
const privateKey = process.env.DEPLOYER_KEY || "0xd4479070c2a31da31a01e732ca51707132bacdb480aae432a0c8bd0b91eba4b7";

export async function GET() {
  try {
    const relayerAccount = createAccount(privateKey as `0x${string}`);
    const client = createClient({
      chain: studioDevnet,
      endpoint: RPC,
      account: relayerAccount,
    });

    const chainId = await client.getChainId();
    const balance = await client.getBalance({ address: relayerAccount.address });

    return NextResponse.json({
      status: "healthy",
      service: "Statute Adjudication Protocol Live API",
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
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "degraded", error: err.message },
      { status: 500 }
    );
  }
}
