import { NextResponse } from "next/server";
import { createClient, createAccount } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const RPC = process.env.STUDIO_DEV_RPC || "https://studio-dev.genlayer.com/api";
const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xa7F7e471d31c0f90A55A73D09CA06f0aD811D84e") as `0x${string}`;
const CONSUMER_ADDRESS = (process.env.NEXT_PUBLIC_CONSUMER_ADDRESS ||
  "0xd084F4f579FC9BCB12baf5fEcfF4bF356178AA10") as `0x${string}`;
const privateKey = process.env.DEPLOYER_KEY;

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
