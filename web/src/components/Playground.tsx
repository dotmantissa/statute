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
} from "lucide-react";

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

  const [activeCodeTab, setActiveCodeTab] = useState<"solidity" | "python" | "typescript">("solidity");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const handleExecuteQuery = React.useCallback(async (hashToQuery?: string) => {
    const target = (hashToQuery || queryHash).trim();
    if (!target) {
      setQueryError("Please enter an action hash to query.");
      return;
    }

    setLoading(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const res = await fetch(`/api/verdict/${encodeURIComponent(target)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to query verdict.");
      }

      setQueryResult(data.status);
    } catch (err: any) {
      setQueryError(err.message || "Failed to execute contract read query.");
    } finally {
      setLoading(false);
    }
  }, [queryHash]);

  // Update when parent passes a new hash
  React.useEffect(() => {
    if (selectedHash) {
      setQueryHash(selectedHash);
      handleExecuteQuery(selectedHash);
    }
  }, [selectedHash, handleExecuteQuery]);

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
    function get_verdict_status(string calldata actionHash) external view returns (
        bool exists,
        string memory verdict,
        bool isCompliant,
        bool isExpired,
        uint256 confidenceScore
    );
}

contract RegulatedTokenVault {
    address public immutable statuteAdjudicator = ${statuteAddress};

    event ActionExecuted(string actionHash, address recipient, uint256 amount);

    function executeComplianceGatedTransfer(
        string calldata actionHash,
        address payable recipient,
        uint256 amount
    ) external {
        // Enforce verified regulatory compliance before any capital transfer
        require(
            IStatuteAdjudicator(statuteAdjudicator).is_action_compliant(actionHash),
            "Statute: Action is not verified compliant or verdict has expired"
        );

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");
        emit ActionExecuted(actionHash, recipient, amount);
    }
}`;

  const pythonCode = `# Intelligent Consumer Contract in Python for GenLayer
from genlayer import *

@gl.contract
class RegulatedAssetVault:
    statute_address: Address
    owner: Address

    def __init__(self, statute_adjudicator: Address):
        self.statute_address = statute_adjudicator
        self.owner = gl.message.sender_account

    @gl.public.write
    def execute_regulated_offering(self, action_hash: str, recipient: Address, amount: u256) -> bool:
        # Cross contract view call to StatuteAdjudicator
        statute = gl.contract.get_at(self.statute_address)
        is_compliant = statute.view().is_action_compliant(action_hash)
        
        if not is_compliant:
            raise Exception("Statute: Action not compliant or adjudication has expired")

        # Execute verified protocol logic on-chain
        return True
`;

  const tsCode = `import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const client = createClient({
  chain: studioDevnet,
  endpoint: "https://studio-dev.genlayer.com/api",
});

const STATUTE_ADDRESS = "${statuteAddress}";

// Check if an action is certified compliant and currently unexpired
export async function verifyActionCompliance(actionHash: string): Promise<boolean> {
  const isCompliant = await client.readContract({
    address: STATUTE_ADDRESS,
    functionName: "is_action_compliant",
    args: [actionHash],
  });
  return isCompliant;
}`;

  const getActiveCode = () => {
    if (activeCodeTab === "solidity") return solidityCode;
    if (activeCodeTab === "python") return pythonCode;
    return tsCode;
  };

  return (
    <section id="playground" className="py-12 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#26ccf0] uppercase tracking-wider">
              <FileCode2 className="w-4 h-4" />
              <span>Smart Contract Playground</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-[#002139] dark:text-white">
              On-chain Gating and Verification
            </h2>
            <p className="text-sm mt-1 text-[#3b5a70] dark:text-[#b0d2e8]">
              Test any action hash directly against the deployed GenLayer contract or integrate
              compliance gating directly into your decentralized protocol.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 p-2 rounded-xl border text-xs font-mono bg-white border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-white">
              <span className="text-[#6b8699] dark:text-[#719bb5]">Statute:</span>
              <span className="text-[#26ccf0] truncate max-w-[120px] sm:max-w-[160px]">
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
          {/* Query Tester Card */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl border bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-[#26ccf0]" />
                <h3 className="text-base font-bold text-[#002139] dark:text-white">
                  Live Contract Query Tester
                </h3>
              </div>

              <p className="text-xs mb-4 text-[#3b5a70] dark:text-[#b0d2e8]">
                Invokes <code className="px-1.5 py-0.5 rounded bg-[#26ccf0]/15 text-[#26ccf0] font-mono">is_action_compliant(hash)</code> on the live GenLayer network to verify if an action passes statutory compliance.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                    Target Action Hash
                  </label>
                  <input
                    type="text"
                    value={queryHash}
                    onChange={(e) => setQueryHash(e.target.value)}
                    placeholder="e.g. 0x8f2d... or paste hash from feed above"
                    className="w-full px-3 py-2.5 rounded-xl border text-xs font-mono outline-none focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleExecuteQuery()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs transition-all bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff] disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${loading ? "animate-pulse" : ""}`} />
                  <span>{loading ? "Reading Contract..." : "Execute On-chain Query"}</span>
                </button>

                {queryError && (
                  <div className="p-3 rounded-xl border flex items-center gap-2 text-xs bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{queryError}</span>
                  </div>
                )}

                {queryResult && (
                  <div className="p-4 rounded-xl border space-y-3 bg-[#f5f9fc] border-[#d2e4f0] dark:bg-[#001e33] dark:border-[#003d66]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#6b8699] dark:text-[#719bb5]">
                        Verdict Outcome
                      </span>
                      {queryResult.verdict === "COMPLIANT" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 dark:text-emerald-400">
                          COMPLIANT
                        </span>
                      )}
                      {queryResult.verdict === "CAUTION_WITH_CONDITIONS" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:text-amber-400">
                          CAUTION
                        </span>
                      )}
                      {queryResult.verdict === "NON_COMPLIANT" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 dark:text-rose-400">
                          NON COMPLIANT
                        </span>
                      )}
                      {!queryResult.exists && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-500/15 text-gray-400 border border-gray-500/30">
                          NOT FOUND
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-white border border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
                        <span className="text-[10px] text-[#6b8699] dark:text-[#719bb5] block">
                          is_action_compliant
                        </span>
                        <span className={`font-mono font-bold ${queryResult.is_compliant ? "text-emerald-500" : "text-rose-500"}`}>
                          {queryResult.is_compliant ? "true" : "false"}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white border border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
                        <span className="text-[10px] text-[#6b8699] dark:text-[#719bb5] block">
                          is_expired
                        </span>
                        <span className={`font-mono font-bold ${queryResult.is_expired ? "text-rose-500" : "text-emerald-500"}`}>
                          {queryResult.is_expired ? "true" : "false"}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#3b5a70] dark:text-[#b0d2e8]">
                      Confidence: <strong>{queryResult.confidence_score}%</strong> &bull; Framework Version: <strong>{queryResult.framework_version || 1}</strong>
                    </div>

                    {queryResult.reasoning && (
                      <div className="text-[11px] leading-relaxed p-2.5 rounded-lg border bg-white border-[#d2e4f0] text-[#3b5a70] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#b0d2e8]">
                        {queryResult.reasoning}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Code Snippet Tabs */}
          <div className="lg:col-span-7">
            <div className="p-6 rounded-2xl border flex flex-col h-full bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
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
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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

              <div className="mt-4 pt-3 border-t border-[#d2e4f0] dark:border-[#003d66] flex items-center justify-between text-xs text-[#6b8699] dark:text-[#719bb5]">
                <span>GenLayer Studio Network &bull; RPC: https://studio-dev.genlayer.com/api</span>
                <a
                  href="https://studio-dev.genlayer.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[#26ccf0] hover:underline"
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
