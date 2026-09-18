import { NextRequest, NextResponse } from "next/server";
import { createClient, createAccount } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const RPC = process.env.STUDIO_DEV_RPC || "https://studio-dev.genlayer.com/api";
const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xf94eef71c96D311ff7Ad0bd35873FD5A27ED57b2") as `0x${string}`;
const privateKey = process.env.DEPLOYER_KEY || "0xd4479070c2a31da31a01e732ca51707132bacdb480aae432a0c8bd0b91eba4b7";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      frameworkId,
      name,
      description,
      issuingAuthority,
      documentUrls,
      jurisdictions,
      validitySeconds,
    } = body;

    if (!frameworkId || !name || !issuingAuthority) {
      return NextResponse.json(
        { error: "frameworkId, name, and issuingAuthority are required." },
        { status: 400 }
      );
    }

    const fid = frameworkId.trim().toLowerCase();
    const docUrlsJson = JSON.stringify(documentUrls || []);
    const jurisJson = JSON.stringify(jurisdictions || ["GLOBAL"]);
    const valSec = BigInt(validitySeconds || 2592000);

    const relayerAccount = createAccount(privateKey as `0x${string}`);
    const client = createClient({
      chain: studioDevnet,
      endpoint: RPC,
      account: relayerAccount,
    });

    const fees = await client.estimateTransactionFees();

    const txHash = await client.writeContract({
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

    return NextResponse.json({
      success: true,
      frameworkId: fid,
      txHash,
      message: "Framework registration submitted to GenLayer validators.",
      source: "genlayer_contract",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to register framework on GenLayer" },
      { status: 500 }
    );
  }
}
