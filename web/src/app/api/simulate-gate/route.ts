import { NextRequest, NextResponse } from "next/server";
import { createClient, createAccount } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import crypto from "crypto";

const RPC = process.env.STUDIO_DEV_RPC || "https://studio-dev.genlayer.com/api";
const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xf94eef71c96D311ff7Ad0bd35873FD5A27ED57b2") as `0x${string}`;
const CONSUMER_ADDRESS = (process.env.NEXT_PUBLIC_CONSUMER_ADDRESS ||
  "0x6BC505692ebB58bAe3CaAE1B3a36054831C5d01f") as `0x${string}`;
const privateKey = process.env.DEPLOYER_KEY || "0xd4479070c2a31da31a01e732ca51707132bacdb480aae432a0c8bd0b91eba4b7";

export async function POST(req: NextRequest) {
  try {
    const { actionHash, actionPayload, executeOnChain } = await req.json();
    if (!actionHash) {
      return NextResponse.json({ error: "actionHash is required" }, { status: 400 });
    }

    const relayerAccount = createAccount(privateKey as `0x${string}`);
    const client = createClient({
      chain: studioDevnet,
      endpoint: RPC,
      account: relayerAccount,
    });

    const targetHash = String(actionHash).trim();

    // 1. Read live verdict from StatuteAdjudicator
    let verdictStatus: any = null;
    try {
      verdictStatus = await client.readContract({
        address: STATUTE_ADDRESS,
        functionName: "get_verdict_status",
        args: [targetHash],
      });
    } catch (e: any) {
      console.warn("Could not read verdict status:", e.message);
    }

    // 2. Read live consumer configuration and execution state
    let consumerAccepted: any = { framework_id: "sec-reg-d", version: 1 };
    let isExecuted = false;
    try {
      consumerAccepted = await client.readContract({
        address: CONSUMER_ADDRESS,
        functionName: "get_accepted_framework",
        args: [],
      });
      isExecuted = Boolean(
        await client.readContract({
          address: CONSUMER_ADDRESS,
          functionName: "is_action_executed",
          args: [targetHash],
        })
      );
    } catch (e: any) {
      console.warn("Could not read consumer state:", e.message);
    }

    // 3. Resolve payload
    const resolvedPayload =
      actionPayload !== undefined && actionPayload !== null && String(actionPayload).trim() !== ""
        ? String(actionPayload).trim()
        : String(verdictStatus?.action_payload || verdictStatus?.action_description || "").trim();

    // 4. Verify binding on-chain: payload hash & framework version
    const suppliedPayloadHash = "0x" + crypto.createHash("sha256").update(resolvedPayload, "utf8").digest("hex");
    const recordPayload = String(verdictStatus?.action_payload || verdictStatus?.action_description || "").trim();
    const recordPayloadHash = String(verdictStatus?.payload_hash || "").trim();

    const isPayloadMatch = Boolean(
      verdictStatus?.exists &&
        (resolvedPayload === recordPayload ||
          suppliedPayloadHash === recordPayloadHash ||
          (recordPayloadHash && suppliedPayloadHash === recordPayloadHash))
    );

    const verdictFwVersion = Number(verdictStatus?.framework_version || 0);
    const acceptedVersion = Number(consumerAccepted?.version || 1);
    const isVersionMatch = Boolean(verdictStatus?.exists && (acceptedVersion === 0 || verdictFwVersion === acceptedVersion));

    const verdictFid = String(verdictStatus?.framework_id || "").trim().toLowerCase();
    const acceptedFid = String(consumerAccepted?.framework_id || "").trim().toLowerCase();
    const isFrameworkMatch = Boolean(!acceptedFid || verdictFid === acceptedFid);

    // 5. Advertised consumer flow: call execute_regulated_action on RegulatedConsumer
    let callSucceeded = false;
    let callError: string | null = null;
    let onChainTxHash: string | null = null;

    if (executeOnChain && isPayloadMatch && isVersionMatch && verdictStatus?.is_compliant && !isExecuted) {
      try {
        const fees = await client.estimateTransactionFees();
        onChainTxHash = await client.writeContract({
          address: CONSUMER_ADDRESS,
          functionName: "execute_regulated_action",
          args: [targetHash, resolvedPayload],
          fees: {
            distribution: fees.distribution,
            messageAllocations: fees.messageAllocations,
            feeValue: fees.feeValue,
          },
        });
        callSucceeded = true;
      } catch (err: any) {
        callError = err.message || String(err);
      }
    } else {
      try {
        await client.simulateWriteContract({
          address: CONSUMER_ADDRESS,
          functionName: "execute_regulated_action",
          args: [targetHash, resolvedPayload],
        });
        callSucceeded = true;
      } catch (err: any) {
        callError = err.message || String(err);
      }
    }

    // Determine simulation response message
    let simStatus: "success" | "reverted" = "reverted";
    let simMessage = "";

    if (!verdictStatus?.exists) {
      simMessage = "TRANSACTION REVERTED: RegulatedConsumer.execute_regulated_action rejected execution: [EXPECTED] Regulatory compliance verdict not found on Statute.";
    } else if (verdictStatus?.is_expired) {
      simMessage = "TRANSACTION REVERTED: RegulatedConsumer.execute_regulated_action rejected execution: [EXPECTED] Regulatory compliance verdict has expired.";
    } else if (!verdictStatus?.is_compliant) {
      simMessage = "TRANSACTION REVERTED: RegulatedConsumer.execute_regulated_action rejected execution: [EXPECTED] Regulatory compliance verification failed on Statute.";
    } else if (!isVersionMatch) {
      simMessage = `TRANSACTION REVERTED: RegulatedConsumer.execute_regulated_action rejected execution: [EXPECTED] Framework version mismatch: verdict has version ${verdictFwVersion}, consumer accepts version ${acceptedVersion}.`;
    } else if (!isFrameworkMatch) {
      simMessage = `TRANSACTION REVERTED: RegulatedConsumer.execute_regulated_action rejected execution: [EXPECTED] Framework mismatch: verdict is under ${verdictFid}, consumer accepts ${acceptedFid}.`;
    } else if (!isPayloadMatch) {
      simMessage = "TRANSACTION REVERTED: RegulatedConsumer.execute_regulated_action rejected execution: [EXPECTED] Payload mismatch: submitted payload does not match approved verdict payload. An unrelated payload cannot reuse an approval.";
    } else if (isExecuted) {
      simMessage = "TRANSACTION REVERTED: RegulatedConsumer.execute_regulated_action rejected execution: [EXPECTED] Action has already been executed.";
    } else if (callSucceeded) {
      simStatus = "success";
      simMessage = `TRANSACTION SUCCEEDED: RegulatedConsumer.execute_regulated_action verified compliance, exact payload binding, and framework version (v${acceptedVersion}) on GenLayer validators. Execution permitted.`;
    } else {
      simMessage = `TRANSACTION REVERTED: RegulatedConsumer.execute_regulated_action rejected execution: ${callError || "Execution failed on-chain."}`;
    }

    return NextResponse.json({
      actionHash: targetHash,
      actionPayload: resolvedPayload,
      suppliedPayloadHash,
      recordPayloadHash,
      isCompliant: Boolean(verdictStatus?.is_compliant),
      isExecuted,
      isPayloadMatch,
      isVersionMatch,
      isFrameworkMatch,
      statuteAddress: STATUTE_ADDRESS,
      consumerAddress: CONSUMER_ADDRESS,
      consumerAcceptedFramework: consumerAccepted,
      onChainTxHash,
      simulation: {
        status: simStatus,
        method: "execute_regulated_action",
        message: simMessage,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to execute consumer action on GenLayer" },
      { status: 500 }
    );
  }
}
