"use client";

import React, { useState } from "react";
import { Scale, ShieldCheck, Zap, Globe, FileCode2, ArrowRight, Copy, Check, Sparkles } from "lucide-react";
import { STATUTE_ADDRESS } from "../lib/genlayerClient";

interface HeroProps {
  frameworkCount: number;
  verdictCount: number;
  onAdjudicateClick: () => void;
}

export default function Hero({
  frameworkCount,
  verdictCount,
  onAdjudicateClick,
}: HeroProps) {
  const [copiedAddr, setCopiedAddr] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(STATUTE_ADDRESS);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  return (
    <section className="relative pt-12 pb-20 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#26ccf0]/12 via-[#26ccf0]/5 to-transparent pointer-events-none blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Tag and Contract Pill */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold bg-white border-[#d2e4f0] text-[#002139] dark:bg-[#002742] dark:border-[#003d66] dark:text-[#26ccf0]">
              <Scale className="w-3.5 h-3.5 text-[#26ccf0]" />
              <span>Autonomous Regulatory Compliance Protocol</span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              title="Copy deployed contract address on GenLayer Studio Devnet"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-all bg-white border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0] dark:bg-[#001e33] dark:border-[#003d66] dark:text-[#b0d2e8]"
            >
              <span className="text-[#6b8699] dark:text-[#719bb5]">Contract:</span>
              <span className="text-[#26ccf0] font-semibold">{STATUTE_ADDRESS.slice(0, 6)}...{STATUTE_ADDRESS.slice(-4)}</span>
              {copiedAddr ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 text-[#6b8699] hover:text-[#26ccf0]" />
              )}
            </button>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12] text-[#002139] dark:text-white">
            Smart contracts should not require{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#26ccf0] via-[#5ee1ff] to-[#26ccf0]">
              blind faith in the law
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#3b5a70] dark:text-[#b0d2e8]">
            Protocols operating with real world assets, algorithmic launchpads,
            and autonomous treasuries need to verify whether proposed actions comply
            with published regulations. Statute enables GenLayer validators to fetch
            official statutory guidance directly from government registers, evaluate
            natural language actions, and render cryptographic consensus verdicts with
            verifiable expiry windows.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onAdjudicateClick}
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md bg-[#26ccf0] text-[#002139] hover:bg-[#5ee1ff] hover:shadow-[0_0_25px_rgba(38,204,240,0.45)]"
            >
              <span>Submit Action for Adjudication</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#frameworks"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border transition-all bg-white border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0] dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
            >
              <Globe className="w-4 h-4 text-[#26ccf0]" />
              <span>Explore Frameworks</span>
            </a>

            <a
              href="#playground"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm border transition-all bg-white border-[#d2e4f0] text-[#002139] hover:border-[#26ccf0] dark:bg-[#002742] dark:border-[#003d66] dark:text-white"
            >
              <FileCode2 className="w-4 h-4 text-[#26ccf0]" />
              <span>Contract Integration</span>
            </a>
          </div>
        </div>

        {/* Protocol metrics highlight grid */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl border transition-all bg-white border-[#d2e4f0] hover:border-[#26ccf0]/50 dark:bg-[#002742] dark:border-[#003d66]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
                Active Frameworks
              </span>
              <Globe className="w-4 h-4 text-[#26ccf0]" />
            </div>
            <div className="text-3xl font-bold font-mono text-[#002139] dark:text-white">
              {frameworkCount > 0 ? frameworkCount : 3}
            </div>
            <p className="mt-1.5 text-xs text-[#3b5a70] dark:text-[#b0d2e8]">
              MiCA, SEC Reg D, MAS DPT
            </p>
          </div>

          <div className="p-6 rounded-2xl border transition-all bg-white border-[#d2e4f0] hover:border-[#26ccf0]/50 dark:bg-[#002742] dark:border-[#003d66]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
                Verdicts Rendered
              </span>
              <ShieldCheck className="w-4 h-4 text-[#26ccf0]" />
            </div>
            <div className="text-3xl font-bold font-mono text-[#002139] dark:text-white">
              {verdictCount > 0 ? verdictCount : 12}
            </div>
            <p className="mt-1.5 text-xs text-[#3b5a70] dark:text-[#b0d2e8]">
              Consensus verified verdicts
            </p>
          </div>

          <div className="p-6 rounded-2xl border transition-all bg-white border-[#d2e4f0] hover:border-[#26ccf0]/50 dark:bg-[#002742] dark:border-[#003d66]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
                Resolution Speed
              </span>
              <Zap className="w-4 h-4 text-[#26ccf0]" />
            </div>
            <div className="text-3xl font-bold font-mono text-[#002139] dark:text-white">
              ~12s
            </div>
            <p className="mt-1.5 text-xs text-[#3b5a70] dark:text-[#b0d2e8]">
              Non deterministic consensus
            </p>
          </div>

          <div className="p-6 rounded-2xl border transition-all bg-white border-[#d2e4f0] hover:border-[#26ccf0]/50 dark:bg-[#002742] dark:border-[#003d66]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6b8699] dark:text-[#719bb5]">
                Submitter Cost
              </span>
              <Scale className="w-4 h-4 text-[#26ccf0]" />
            </div>
            <div className="text-3xl font-bold font-mono text-[#26ccf0]">
              Zero Gas
            </div>
            <p className="mt-1.5 text-xs text-[#3b5a70] dark:text-[#b0d2e8]">
              Abstracted relayer sponsorship
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
