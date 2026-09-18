"use client";

import React, { useState } from "react";
import {
  FileCode2,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Terminal,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { queryLiveVerdictStatus, checkLiveActionCompliance } from "../lib/genlayerClient";

interface PlaygroundProps {
  selectedHash?: string;
  statuteAddress: string;
  consumerAddress: string;
}

export default function Playground({
  selectedHash = "",
  statuteAddress,
  consumerAddress,
}: PlaygroundProps) {
  const [queryHash, setQueryHash] = useState(selectedHash);
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Simulation state
  const [simulating, setSimulating] = useState(false);
  const [simPayload, setSimPayload] = useState("");
  const [simResult, setSimResult] = useState<{
    status: "success" | "revert";
    message: string;
  } | null>(null);

  const [activeCodeTab, setActiveCodeTab] = useState<"solidity" | "python" | "typescript">("solidity");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const handleExecuteQuery = React.useCallback(
    async (hashToQuery?: string) => {
      const target = (hashToQuery || queryHash).trim();
      if (!target) {
        setQueryError("Please enter an action hash to query.");
        return;
      }

      setLoading(true);
      setQueryError(null);
      setQueryResult(null);
      setSimResult(null);

      try {
        const res = await fetch(`/api/verdict/${encodeURIComponent(target)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            setQueryResult(data.status);
            setSimPayload(data.status.action_payload || data.status.action_description || "");
            return;
          }
        }
        // Fallback directly to live GenLayer Studio contract
        const status = await queryLiveVerdictStatus(target);
        setQueryResult(status);
        setSimPayload(status?.action_payload || status?.action_description || "");
      } catch {
        try {
          const status = await queryLiveVerdictStatus(target);
          setQueryResult(status);
          setSimPayload(status?.action_payload || status?.action_description || "");
        } catch (directErr: any) {
          setQueryError(directErr.message || "Failed to execute contract read query.");
        }
      } finally {
        setLoading(false);
      }
    },
    [queryHash]
  );

  React.useEffect(() => {
    if (selectedHash) {
      setQueryHash(selectedHash);
      handleExecuteQuery(selectedHash);
    }
  }, [selectedHash, handleExecuteQuery]);

  const handleSimulateConsumer = async (overridePayload?: string) => {
    if (!queryResult) return;
    setSimulating(true);
    setSimResult(null);

    const payloadToSend = overridePayload !== undefined ? overridePayload : simPayload;

    try {
      const res = await fetch("/api/simulate-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionHash: queryResult.action_hash,
          actionPayload: payloadToSend,
        }),
      });

      const data = await res.json();
      if (data.simulation) {
        setSimResult({
          status: data.simulation.status === "success" ? "success" : "revert",
          message: data.simulation.message,
        });
      } else if (data.error) {
        setSimResult({
          status: "revert",
          message: `TRANSACTION REVERTED: RegulatedConsumer.execute_regulated_action failed: ${data.error}`,
        });
      }
    } catch (err: any) {
      setSimResult({
        status: "revert",
        message: `TRANSACTION REVERTED: RegulatedConsumer.execute_regulated_action call error: ${err.message}`,
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyAddr = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const solidityCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStatuteAdjudicator {
    function is_action_compliant(string calldata actionHash) external view returns (bool);
    function verify_action_payload(
        string calldata actionHash,
        string calldata actionPayload,
        uint256 frameworkVersion
    ) external view returns (bool);
    function get_verdict_status(string calldata actionHash) external view returns (
        bool exists,
        string memory verdict,
        bool isCompliant,
        bool isExpired,
        uint256 confidenceScore
    );
}

interface IRegulatedConsumer {
    function execute_regulated_action(
        string calldata actionHash,
        string calldata actionPayload
    ) external returns (bool);
}

contract RegulatedTokenVault {
    address public immutable statuteAdjudicator = ${statuteAddress};
    address public immutable regulatedConsumer = ${consumerAddress};
    uint256 public constant ACCEPTED_FRAMEWORK_VERSION = 1;

    event ActionExecuted(string actionHash, string actionPayload);

    function executeComplianceGatedAction(
        string calldata actionHash,
        string calldata actionPayload
    ) external {
        // Enforce exact payload and framework version binding via RegulatedConsumer
        bool permitted = IRegulatedConsumer(regulatedConsumer).execute_regulated_action(
            actionHash,
            actionPayload
        );
        require(permitted, "Statute: Action payload or framework version rejected on-chain");

        emit ActionExecuted(actionHash, actionPayload);
    }
}`;

  const pythonCode = `# Intelligent Consumer Contract in Python for GenLayer
from genlayer import *
import hashlib

@gl.contract
class RegulatedAssetVault:
    statute_address: Address
    accepted_framework_version: u256
    total_executed: u256
    config: gl.storage.TreeMap[str, str]
    executed_actions: gl.storage.TreeMap[str, bool]

    def __init__(self, statute_adjudicator: Address, framework_id: str = "sec-reg-d", version: u256 = u256(1)):
        self.statute_address = Address(str(statute_adjudicator))
        self.accepted_framework_version = u256(int(version))
        self.config["framework_id"] = str(framework_id).strip().lower()
        self.total_executed = u256(0)

    @gl.public.write
    def execute_regulated_action(self, action_hash: str, action_payload: str) -> bool:
        """
        Executes a regulated action only if StatuteAdjudicator verifies compliance.
        Binds verdict strictly to the exact payload and framework version accepted by this consumer.
        Reverts if an unrelated payload attempts to reuse an approval.
        """
        h = str(action_hash).strip()
        payload = str(action_payload).strip()

        if self.executed_actions.get(h, False):
            raise Exception("Statute: Action already executed")

        # Query StatuteAdjudicator for authoritative verdict
        statute = gl.contract.get_at(self.statute_address)
        status = statute.view().get_verdict_status(h)

        if not status.get("is_compliant", False) or status.get("is_expired", False):
            raise Exception("Statute: Verdict not compliant or has expired")

        # 1. Enforce exact framework version binding
        if int(status.get("framework_version", 0)) != int(self.accepted_framework_version):
            raise Exception("Statute: Framework version mismatch")

        # 2. Enforce exact payload binding (unrelated payload cannot reuse approval)
        record_payload = str(status.get("action_payload", status.get("action_description", ""))).strip()
        record_payload_hash = str(status.get("payload_hash", "")).strip()
        supplied_payload_hash = "0x" + hashlib.sha256(payload.encode("utf-8")).hexdigest()

        if payload != record_payload and supplied_payload_hash != record_payload_hash:
            raise Exception("Statute: Payload mismatch. Unrelated payload cannot reuse approval.")

        self.executed_actions[h] = True
        self.total_executed = u256(int(self.total_executed) + 1)
        return True
`;

  const tsCode = `import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const client = createClient({
  chain: studioDevnet,
  endpoint: "https://studio-dev.genlayer.com/api",
});

const CONSUMER_ADDRESS = "${consumerAddress}";

// Call execute_regulated_action with exact payload binding
export async function executeRegulatedAction(
  actionHash: string,
  actionPayload: string
): Promise<boolean> {
  // Invokes execute_regulated_action on RegulatedConsumer
  // Enforces exact payload match and framework version 1
  const result = await client.simulateWriteContract({
    address: CONSUMER_ADDRESS,
    functionName: "execute_regulated_action",
    args: [actionHash.trim(), actionPayload.trim()],
  });
  return Boolean(result);
}`;

  const getActiveCode = () => {
    if (activeCodeTab === "solidity") return solidityCode;
    if (activeCodeTab === "python") return pythonCode;
    return tsCode;
  };

  return (
    <section id="playground" className="py-16 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#26ccf0] uppercase tracking-wider">
              <FileCode2 className="w-4 h-4" />
              <span>Smart Contract Playground</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight mt-1.5 text-[#002139] dark:text-white">
              On-chain Gating and Verification
            </h2>
            <p className="text-sm mt-1.5 text-[#3b5a70] dark:text-[#b0d2e8]">
              Test any action hash directly against the deployed GenLayer contract or integrate
              compliance gating directly into your decentralized protocol.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono bg-white border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-white">
              <span className="text-[#6b8699] dark:text-[#719bb5]">Statute:</span>
              <span className="text-[#26ccf0] font-semibold truncate max-w-[130px] sm:max-w-[170px]">
                {statuteAddress}
              </span>
              <button
                type="button"
                onClick={() => handleCopyAddr(statuteAddress)}
                className="p-1 text-[#26ccf0] hover:bg-[#26ccf0]/10 rounded"
              >
                {copiedAddr === statuteAddress ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Query Tester Column */}
          <div className="lg:col-span-5">
            <div className="p-7 rounded-2xl border bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-[#26ccf0]" />
                <h3 className="text-base font-bold text-[#002139] dark:text-white">
                  Live Contract Query Tester
                </h3>
              </div>

              <p className="text-xs mb-5 text-[#3b5a70] dark:text-[#b0d2e8] leading-relaxed">
                Invokes <code className="px-1.5 py-0.5 rounded bg-[#26ccf0]/15 text-[#26ccf0] font-mono font-semibold">is_action_compliant(hash)</code> on the live GenLayer network to verify if an action passes statutory compliance.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5 text-[#3b5a70] dark:text-[#b0d2e8]">
                    Target Action Hash
                  </label>
                  <input
                    type="text"
                    value={queryHash}
                    onChange={(e) => setQueryHash(e.target.value)}
                    placeholder="e.g. 0x8f2d... or paste hash from feed above"
                    className="w-full px-4 py-3 rounded-xl border text-xs font-mono outline-none focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleExecuteQuery()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff] disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${loading ? "animate-pulse" : ""}`} />
                  <span>{loading ? "Querying GenLayer Blockchain..." : "Execute On-chain Query"}</span>
                </button>

                {queryError && (
                  <div className="p-3.5 rounded-xl border flex items-center gap-2 text-xs bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{queryError}</span>
                  </div>
                )}

                {queryResult && (
                  <div className="p-5 rounded-xl border space-y-4 bg-[#f5f9fc] border-[#d2e4f0] dark:bg-[#001e33] dark:border-[#003d66]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
                        Verdict Outcome
                      </span>
                      {queryResult.verdict === "COMPLIANT" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 dark:text-emerald-400">
                          COMPLIANT
                        </span>
                      )}
                      {queryResult.verdict === "CAUTION_WITH_CONDITIONS" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:text-amber-400">
                          CAUTION
                        </span>
                      )}
                      {queryResult.verdict === "NON_COMPLIANT" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 dark:text-rose-400">
                          NON COMPLIANT
                        </span>
                      )}
                      {!queryResult.exists && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/15 text-gray-400 border border-gray-500/30">
                          NOT FOUND
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white border border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
                        <span className="text-[10px] text-[#6b8699] dark:text-[#719bb5] uppercase font-bold block mb-1">
                          is_action_compliant
                        </span>
                        <span className={`font-mono font-bold text-sm ${queryResult.is_compliant ? "text-emerald-500" : "text-rose-500"}`}>
                          {queryResult.is_compliant ? "true" : "false"}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-white border border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
                        <span className="text-[10px] text-[#6b8699] dark:text-[#719bb5] uppercase font-bold block mb-1">
                          is_expired
                        </span>
                        <span className={`font-mono font-bold text-sm ${queryResult.is_expired ? "text-rose-500" : "text-emerald-500"}`}>
                          {queryResult.is_expired ? "true" : "false"}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-[#3b5a70] dark:text-[#b0d2e8]">
                      Confidence: <strong>{queryResult.confidence_score}%</strong> &bull; Framework Version: <strong>{queryResult.framework_version || 1}</strong>
                    </div>

                    {queryResult.reasoning && (
                      <div className="text-xs leading-relaxed p-3 rounded-lg border bg-white border-[#d2e4f0] text-[#3b5a70] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#b0d2e8]">
                        {queryResult.reasoning}
                      </div>
                    )}

                    {/* Advertised Consumer Gating Flow: execute_regulated_action */}
                    <div className="pt-3 border-t border-[#d2e4f0] dark:border-[#003d66] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#002139] dark:text-white flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-[#26ccf0]" />
                          <span>Consumer Flow: execute_regulated_action</span>
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#6b8699] dark:text-[#719bb5]">
                          Action Payload to Execute
                        </label>
                        <textarea
                          rows={2}
                          value={simPayload}
                          onChange={(e) => setSimPayload(e.target.value)}
                          placeholder="e.g. JSON action payload or transfer spec"
                          className="w-full px-3 py-2 rounded-lg border text-xs font-mono outline-none focus:border-[#26ccf0] bg-white border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const approved = queryResult.action_payload || queryResult.action_description || "";
                            setSimPayload(approved);
                            handleSimulateConsumer(approved);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all text-center"
                        >
                          Test Approved Payload
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const tampered = JSON.stringify({
                              recipient: "0xAttackerVault666",
                              amount: 100000000,
                              action: "unauthorized_drain",
                            });
                            setSimPayload(tampered);
                            handleSimulateConsumer(tampered);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all text-center"
                        >
                          Test Unrelated Payload
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={simulating}
                        onClick={() => handleSimulateConsumer()}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff] disabled:opacity-50 transition-all"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>{simulating ? "Executing on-chain..." : "Call execute_regulated_action"}</span>
                      </button>

                      {simResult && (
                        <div
                          className={`p-3 rounded-lg text-xs font-mono leading-relaxed border ${
                            simResult.status === "success"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {simResult.message}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Code Snippet Tabs Column */}
          <div className="lg:col-span-7">
            <div className="p-7 rounded-2xl border flex flex-col h-full bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#26ccf0]" />
                  <h3 className="text-base font-bold text-[#002139] dark:text-white">
                    Protocol Integration Snippets
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#f5f9fc] border border-[#d2e4f0] dark:bg-[#001e33] dark:border-[#003d66]">
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("solidity")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeCodeTab === "solidity"
                        ? "bg-[#26ccf0] text-[#002139]"
                        : "text-[#6b8699] hover:text-white"
                    }`}
                  >
                    Solidity
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("python")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeCodeTab === "python"
                        ? "bg-[#26ccf0] text-[#002139]"
                        : "text-[#6b8699] hover:text-white"
                    }`}
                  >
                    GenLayer Python
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeTab("typescript")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeCodeTab === "typescript"
                        ? "bg-[#26ccf0] text-[#002139]"
                        : "text-[#6b8699] hover:text-white"
                    }`}
                  >
                    TypeScript SDK
                  </button>
                </div>
              </div>

              <div className="relative flex-1">
                <pre className="h-full max-h-[380px] overflow-auto p-4 rounded-xl font-mono text-xs leading-relaxed border bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001525] dark:border-[#003d66] dark:text-[#5ee1ff]">
                  <code>{getActiveCode()}</code>
                </pre>

                <button
                  type="button"
                  onClick={() => handleCopyCode(getActiveCode())}
                  className="absolute top-3 right-3 p-2 rounded-lg border transition-all bg-white border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#26ccf0]"
                  title="Copy Code"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#d2e4f0] dark:border-[#003d66] flex items-center justify-between text-xs text-[#6b8699] dark:text-[#719bb5]">
                <span>GenLayer Studio Network &bull; RPC: https://studio-dev.genlayer.com/api</span>
                <a
                  href="https://studio-dev.genlayer.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[#26ccf0] hover:underline font-semibold"
                >
                  <span>Network Status</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
