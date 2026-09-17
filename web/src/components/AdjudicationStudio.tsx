"use client";

import React, { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  Scale,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  FileText,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";

interface Framework {
  framework_id: string;
  name: string;
  issuing_authority: string;
  jurisdictions: string[];
}

interface AdjudicationResult {
  success: boolean;
  txHash: string;
  actionHash: string;
  verdictId: string;
  verdict: "COMPLIANT" | "CAUTION_WITH_CONDITIONS" | "NON_COMPLIANT";
  isCompliant: boolean;
  isExpired: boolean;
  expiresAt: number;
  confidenceScore: number;
  applicableClauses: string[];
  conditions: string[];
  reasoning: string;
  riskFactors: string[];
  frameworkId: string;
}

const PRESET_SCENARIOS = [
  {
    title: "RWA Private Placement Vault",
    actionId: "rwa-accredited-vault-2026",
    frameworkId: "sec-reg-d",
    actionTitle: "Private Placement of Tokenized Treasury Yield Notes to Verified Accredited Investors",
    jurisdictions: ["US"],
    description:
      "Protocol proposes to issue digital tokenized notes representing beneficial ownership in short dated US Treasury bills under Rule 506c of Regulation D. Tokens will be sold exclusively to verified accredited investors following mandatory third party income and net worth documentation. Transfers will be restricted through smart contract whitelisting requiring accredited investor credentials, with a mandatory one year holding period lock enforced prior to any secondary market trading. No general public solicitation without verification.",
  },
  {
    title: "MiCA Compliant Asset Referenced Token",
    actionId: "mica-art-reserve-pool-2026",
    frameworkId: "mica-2023",
    actionTitle: "Cross Border Liquidity Pool for Euro Backed Asset Referenced Token",
    jurisdictions: ["EU"],
    description:
      "Decentralized liquidity pool facilitating automated swaps for a Euro denominated asset referenced token issued by an authorized European credit institution. The token issuer holds one to one liquid cash reserves in segregated custodian bank accounts, publishes daily audited reserve attestations, provides clear redemption rights for holders within two business days, and implements automated transaction monitoring to prevent market abuse in accordance with MiCA Title III requirements.",
  },
  {
    title: "MAS Digital Payment Token Yield Strategy",
    actionId: "mas-dpt-institutional-vault",
    frameworkId: "mas-dpt-2020",
    actionTitle: "Institutional Custody and Lending Facility for Major Digital Payment Tokens",
    jurisdictions: ["SG"],
    description:
      "Institutional treasury lending facility offering collateralized borrowing of Bitcoin and Ether to licensed capital markets service entities in Singapore. Borrower collateral is segregated in institutional multi signature custody with daily rehypothecation limits. The facility maintains strict customer due diligence policies and prohibits lending to retail participants in alignment with Monetary Authority of Singapore digital payment token service guidelines.",
  },
];

interface AdjudicationStudioProps {
  frameworks: Framework[];
  onVerdictCreated?: (verdict: AdjudicationResult) => void;
}

export default function AdjudicationStudio({
  frameworks,
  onVerdictCreated,
}: AdjudicationStudioProps) {
  const { authenticated, user } = usePrivy();
  const userEmail = user?.email?.address || (user as any)?.google?.email || "anonymous";

  const [actionId, setActionId] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [frameworkId, setFrameworkId] = useState("sec-reg-d");
  const [jurisdictions, setJurisdictions] = useState<string[]>(["US"]);
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<AdjudicationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const availableJurisdictions = ["US", "EU", "SG", "UK", "CH", "GLOBAL"];

  const toggleJurisdiction = (j: string) => {
    if (jurisdictions.includes(j)) {
      if (jurisdictions.length > 1) {
        setJurisdictions(jurisdictions.filter((item) => item !== j));
      }
    } else {
      setJurisdictions([...jurisdictions, j]);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setActionId(`${preset.actionId}-${Date.now().toString().slice(-4)}`);
    setActionTitle(preset.actionTitle);
    setFrameworkId(preset.frameworkId);
    setJurisdictions(preset.jurisdictions);
    setDescription(preset.description);
    setResult(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionId || !description || !frameworkId) {
      setErrorMessage("Please fill in the action identifier and proposed specification.");
      return;
    }

    if (description.trim().length < 20) {
      setErrorMessage("Action specification must be at least 20 characters for legal analysis.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setResult(null);
    setStepIndex(1);

    // Simulate progressive validator steps
    const stepTimer1 = setTimeout(() => setStepIndex(2), 2500);
    const stepTimer2 = setTimeout(() => setStepIndex(3), 5500);
    const stepTimer3 = setTimeout(() => setStepIndex(4), 8500);

    try {
      const response = await fetch("/api/adjudicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: actionId.trim(),
          frameworkId: frameworkId.trim(),
          actionTitle: (actionTitle || actionId).trim(),
          actionDescription: description.trim(),
          jurisdictions,
          userEmail,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Adjudication failed to execute.");
      }

      setResult(data);
      setStepIndex(5);
      if (onVerdictCreated) {
        onVerdictCreated(data);
      }
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setErrorMessage(err.message || "An unexpected error occurred.");
      setStepIndex(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHash = () => {
    if (result?.actionHash) {
      navigator.clipboard.writeText(result.actionHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <section id="adjudicate" className="py-12 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#26ccf0] uppercase tracking-wider">
              <Scale className="w-4 h-4" />
              <span>Consensus Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-[#002139] dark:text-white">
              Interactive Adjudication Studio
            </h2>
            <p className="text-sm mt-1 text-[#3b5a70] dark:text-[#b0d2e8]">
              Describe your proposed on-chain action in plain language. Validators
              fetch published statutory guidance and render consensus verdicts.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-medium bg-[#26ccf0]/10 border-[#26ccf0]/30 text-[#002139] dark:text-[#26ccf0]">
            <Shield className="w-4 h-4 text-[#26ccf0]" />
            <span>Gasless Relayer Active</span>
          </div>
        </div>

        {/* Preset selector pills */}
        <div className="mb-6 p-4 rounded-2xl border bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#26ccf0]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
              Quick Load Sample Scenarios
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_SCENARIOS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-3 py-1.5 rounded-xl border text-xs font-medium transition-all text-left bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white dark:hover:border-[#26ccf0]"
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Submission Form */}
          <div className="lg:col-span-7">
            <form
              onSubmit={handleSubmit}
              className="p-6 rounded-2xl border shadow-sm bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]"
            >
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-[#3b5a70] dark:text-[#b0d2e8]">
                    Action Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={actionId}
                    onChange={(e) => setActionId(e.target.value)}
                    placeholder="e.g. rwa-yield-vault-2026"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm font-mono outline-none transition-all focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                  />
                  <p className="text-[11px] mt-1 text-[#6b8699] dark:text-[#719bb5]">
                    Unique protocol reference for on-chain indexing and smart contract gating.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-[#3b5a70] dark:text-[#b0d2e8]">
                    Action Title
                  </label>
                  <input
                    type="text"
                    value={actionTitle}
                    onChange={(e) => setActionTitle(e.target.value)}
                    placeholder="e.g. Offering of Tokenized Short Term Government Notes"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-[#3b5a70] dark:text-[#b0d2e8]">
                      Regulatory Framework
                    </label>
                    <div className="relative">
                      <select
                        value={frameworkId}
                        onChange={(e) => setFrameworkId(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border text-sm outline-none transition-all focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                      >
                        {frameworks.length > 0 ? (
                          frameworks.map((f) => (
                            <option key={f.framework_id} value={f.framework_id}>
                              {f.name} ({f.framework_id})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="sec-reg-d">SEC Regulation D (Rules 504, 506b, 506c)</option>
                            <option value="mica-2023">EU Markets in Crypto Assets Regulation (MiCA)</option>
                            <option value="mas-dpt-2020">MAS Digital Payment Token Regulatory Guidance</option>
                          </>
                        )}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 pointer-events-none text-[#6b8699]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-[#3b5a70] dark:text-[#b0d2e8]">
                      Target Jurisdictions
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableJurisdictions.map((j) => {
                        const isSelected = jurisdictions.includes(j);
                        return (
                          <button
                            key={j}
                            type="button"
                            onClick={() => toggleJurisdiction(j)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-[#26ccf0] text-[#002139] font-bold shadow-sm"
                                : "bg-[#f5f9fc] text-[#3b5a70] border border-[#d2e4f0] dark:bg-[#001e33] dark:text-[#b0d2e8] dark:border-[#003d66]"
                            }`}
                          >
                            {j}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-[#3b5a70] dark:text-[#b0d2e8]">
                    Proposed Action Specification (Natural Language)
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe transaction mechanics, participant accreditation criteria, redemption policies, transfer restrictions, and reserve management..."
                    className="w-full px-4 py-3 rounded-xl border text-sm leading-relaxed outline-none transition-all focus:border-[#26ccf0] bg-[#f5f9fc] border-[#d2e4f0] text-[#002139] dark:bg-[#001e33] dark:border-[#003d66] dark:text-white"
                  />
                  <p className="text-[11px] mt-1 text-[#6b8699] dark:text-[#719bb5]">
                    Minimum 20 characters. The clearer and more specific the legal structure, the higher the validator consensus confidence.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl border flex items-start gap-2 text-xs bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all shadow-md bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff] hover:shadow-[0_0_25px_rgba(38,204,240,0.45)] disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validators Adjudicating Action...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Action for Consensus Adjudication</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] mt-2 text-[#6b8699] dark:text-[#719bb5]">
                    Sponsored by Statute Relayer &bull; Zero native gas fees required &bull; Authenticated email: {userEmail}
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Real Time Progress & Verdict Output */}
          <div className="lg:col-span-5">
            {loading ? (
              <div className="h-full p-6 rounded-2xl border flex flex-col justify-center bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
                <div className="text-center mb-6">
                  <div className="inline-flex p-3 rounded-full mb-3 bg-[#26ccf0]/15 text-[#26ccf0]">
                    <Loader2 className="w-8 h-8 animate-spin text-[#26ccf0]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#002139] dark:text-white">
                    Consensus Adjudication in Progress
                  </h3>
                  <p className="text-xs mt-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                    GenLayer validators are executing non deterministic compliance verification.
                  </p>
                </div>

                <div className="space-y-3 max-w-sm mx-auto w-full">
                  <div className="flex items-center gap-3 text-xs">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${stepIndex >= 1 ? "bg-[#26ccf0] text-[#002139]" : "bg-gray-300 text-gray-700"}`}>
                      {stepIndex > 1 ? <Check className="w-3 h-3" /> : "1"}
                    </div>
                    <span className={stepIndex >= 1 ? "text-[#002139] font-medium dark:text-white" : "text-[#6b8699]"}>
                      Broadcasting action to GenLayer network
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${stepIndex >= 2 ? "bg-[#26ccf0] text-[#002139]" : "bg-gray-300 text-gray-700"}`}>
                      {stepIndex > 2 ? <Check className="w-3 h-3" /> : "2"}
                    </div>
                    <span className={stepIndex >= 2 ? "text-[#002139] font-medium dark:text-white" : "text-[#6b8699]"}>
                      Validators fetching official statutory text
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${stepIndex >= 3 ? "bg-[#26ccf0] text-[#002139]" : "bg-gray-300 text-gray-700"}`}>
                      {stepIndex > 3 ? <Check className="w-3 h-3" /> : "3"}
                    </div>
                    <span className={stepIndex >= 3 ? "text-[#002139] font-medium dark:text-white" : "text-[#6b8699]"}>
                      Evaluating legal criteria and clauses
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${stepIndex >= 4 ? "bg-[#26ccf0] text-[#002139]" : "bg-gray-300 text-gray-700"}`}>
                      {stepIndex > 4 ? <Check className="w-3 h-3" /> : "4"}
                    </div>
                    <span className={stepIndex >= 4 ? "text-[#002139] font-medium dark:text-white" : "text-[#6b8699]"}>
                      Reaching consensus and recording verdict
                    </span>
                  </div>
                </div>
              </div>
            ) : result ? (
              <div className="p-6 rounded-2xl border shadow-md transition-all bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
                      Adjudication Result
                    </span>
                    <h3 className="text-xl font-bold mt-0.5 text-[#002139] dark:text-white">
                      Consensus Reached
                    </h3>
                  </div>

                  {/* Verdict Badge */}
                  {result.verdict === "COMPLIANT" && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>COMPLIANT</span>
                    </div>
                  )}
                  {result.verdict === "CAUTION_WITH_CONDITIONS" && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>CAUTION WITH CONDITIONS</span>
                    </div>
                  )}
                  {result.verdict === "NON_COMPLIANT" && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 dark:text-rose-400">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>NON COMPLIANT</span>
                    </div>
                  )}
                </div>

                {/* Metrics bar */}
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl bg-[#f5f9fc] border border-[#d2e4f0] dark:bg-[#001e33] dark:border-[#003d66]">
                  <div>
                    <span className="text-[10px] text-[#6b8699] dark:text-[#719bb5] uppercase block">
                      Confidence Score
                    </span>
                    <span className="text-lg font-bold font-mono text-[#26ccf0]">
                      {result.confidenceScore}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6b8699] dark:text-[#719bb5] uppercase block">
                      Status
                    </span>
                    <span className={`text-sm font-semibold ${result.isCompliant ? "text-emerald-500" : "text-rose-500"}`}>
                      {result.isCompliant ? "Approved for Execution" : "Execution Prohibited"}
                    </span>
                  </div>
                </div>

                {/* Action Hash */}
                <div className="mb-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5] block mb-1">
                    On-chain Action Hash
                  </span>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-[#f5f9fc] border border-[#d2e4f0] dark:bg-[#001e33] dark:border-[#003d66]">
                    <span className="text-xs font-mono truncate flex-1 text-[#002139] dark:text-[#b0d2e8]">
                      {result.actionHash}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      className="p-1 rounded text-[#26ccf0] hover:bg-[#26ccf0]/10"
                      title="Copy Action Hash"
                    >
                      {copiedHash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Reasoning summary */}
                <div className="mb-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5] block mb-1">
                    Judicial Reasoning
                  </span>
                  <p className="text-xs leading-relaxed text-[#3b5a70] dark:text-[#b0d2e8]">
                    {result.reasoning}
                  </p>
                </div>

                {/* Conditions (if caution) */}
                {result.conditions && result.conditions.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-500 block mb-1">
                      Required Conditions for Compliance
                    </span>
                    <ul className="space-y-1">
                      {result.conditions.map((cond, i) => (
                        <li key={i} className="text-xs flex items-start gap-1.5 text-[#3b5a70] dark:text-[#b0d2e8]">
                          <span className="text-amber-500 mt-0.5">&bull;</span>
                          <span>{cond}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Applicable clauses */}
                {result.applicableClauses && result.applicableClauses.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5] block mb-1">
                      Applicable Statutory Clauses
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.applicableClauses.map((clause, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded font-mono bg-[#26ccf0]/10 text-[#002139] dark:text-[#26ccf0] border border-[#26ccf0]/30"
                        >
                          {clause}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer links */}
                <div className="pt-3 border-t border-[#d2e4f0] dark:border-[#003d66] flex items-center justify-between text-xs">
                  <a
                    href={`https://studio-dev.genlayer.com`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[#26ccf0] hover:underline"
                  >
                    <span>View on Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <a
                    href="#playground"
                    className="text-[#3b5a70] dark:text-[#b0d2e8] hover:text-[#26ccf0]"
                  >
                    Test in Playground &rarr;
                  </a>
                </div>
              </div>
            ) : (
              <div className="h-full p-6 rounded-2xl border flex flex-col items-center justify-center text-center bg-white border-[#d2e4f0] dark:bg-[#002742] dark:border-[#003d66]">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-[#26ccf0]/10 text-[#26ccf0]">
                  <Scale className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#002139] dark:text-white">
                  Awaiting Proposed Action
                </h3>
                <p className="text-xs max-w-xs mt-1 text-[#3b5a70] dark:text-[#b0d2e8]">
                  Select one of the sample scenarios above or enter custom action specifications to trigger consensus adjudication.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
