import { NextRequest, NextResponse } from "next/server";
import { createClient, createAccount } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const RPC = process.env.STUDIO_DEV_RPC || "https://studio-dev.genlayer.com/api";
const STATUTE_ADDRESS = (process.env.NEXT_PUBLIC_STATUTE_ADDRESS ||
  "0xa7F7e471d31c0f90A55A73D09CA06f0aD811D84e") as `0x${string}`;
const privateKey = process.env.DEPLOYER_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      actionId,
      frameworkId,
      actionTitle,
      actionDescription,
      jurisdictions,
      actionMetadata,
      userEmail,
    } = body;

    if (!actionId || !frameworkId || !actionDescription) {
      return NextResponse.json(
        { error: "actionId, frameworkId, and actionDescription are required." },
        { status: 400 }
      );
    }

    if (actionDescription.trim().length < 15) {
      return NextResponse.json(
        { error: "Action description must be at least 15 characters for legal evaluation." },
        { status: 400 }
      );
    }

    const fid = frameworkId.trim().toLowerCase();
    const actId = actionId.trim();
    const title = (actionTitle || actId).trim();
    const desc = actionDescription.trim();
    const jurisJson = JSON.stringify(jurisdictions || ["GLOBAL"]);
    const metaJson = JSON.stringify(actionMetadata || {});

    const relayerAccount = createAccount(privateKey as `0x${string}`);
    const client = createClient({
      chain: studioDevnet,
      endpoint: RPC,
      account: relayerAccount,
    });

    console.log(`[Relayer] Adjudicating action "${actId}" against framework "${fid}" for ${userEmail || "anonymous"}...`);

    // 1. Estimate fees
    const fees = await client.estimateTransactionFees();

    // 2. Submit write transaction to GenLayer validators
    const txHash = await client.writeContract({
      address: STATUTE_ADDRESS,
      functionName: "adjudicate_action",
      args: [actId, fid, title, desc, jurisJson, metaJson],
      fees: {
        distribution: fees.distribution,
        messageAllocations: fees.messageAllocations,
        feeValue: fees.feeValue,
      },
    });

    console.log(`[Relayer] Submitted transaction to GenLayer: ${txHash}`);

    // 3. Poll for transaction consensus completion (max 90s)
    const startTime = Date.now();
    const maxWaitMs = 90000;
    let finalTx: any = null;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const tx = await client.getTransaction({ hash: txHash });
        if (
          tx &&
          (tx.statusName === "ACCEPTED" ||
            tx.statusName === "FINALIZED" ||
            (tx as any).result_name === "MAJORITY_AGREE" ||
            (tx as any).resultName === "MAJORITY_AGREE" ||
            ((tx as any).lifecycle && (tx as any).lifecycle.state === "decided"))
        ) {
          finalTx = tx;
          break;
        }
      } catch {
        // Transient network hiccup, retry
      }
      await new Promise((r) => setTimeout(r, 2500));
    }

    // 4. Compute action hash and read live on-chain verdict directly from contract
    const actionHash: any = await client.readContract({
      address: STATUTE_ADDRESS,
      functionName: "compute_action_hash",
      args: [actId, fid, desc],
    });

    const status: any = await client.readContract({
      address: STATUTE_ADDRESS,
      functionName: "get_verdict_status",
      args: [String(actionHash)],
    });

    if (!status.exists) {
      // If transaction is still in pipeline, inform client of pending status
      return NextResponse.json({
        success: true,
        pending: true,
        txHash,
        actionHash: String(actionHash),
        message: "Transaction submitted to GenLayer validators and currently processing consensus.",
        frameworkId: fid,
      });
    }

    console.log(`[Relayer] On-chain adjudication confirmed: ${status.verdict} (${status.confidence_score}%)`);

    return NextResponse.json({
      success: true,
      pending: false,
      txHash,
      actionHash: String(actionHash),
      verdictId: status.verdict_id,
      verdict: status.verdict,
      isCompliant: status.is_compliant,
      isExpired: status.is_expired,
      expiresAt: status.expires_at,
      confidenceScore: status.confidence_score,
      applicableClauses: status.applicable_clauses,
      conditions: status.conditions,
      reasoning: status.reasoning,
      riskFactors: status.risk_factors,
      frameworkId: fid,
      statuteAddress: STATUTE_ADDRESS,
      source: "genlayer_validator_consensus",
    });
  } catch (err: any) {
    console.error("[Relayer] Adjudication error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute adjudication on GenLayer" },
      { status: 500 }
    );
  }
}
