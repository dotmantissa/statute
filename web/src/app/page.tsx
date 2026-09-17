"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import AdjudicationStudio from "../components/AdjudicationStudio";
import VerdictsFeed, { VerdictItem } from "../components/VerdictsFeed";
import FrameworkRegistry, { FrameworkData } from "../components/FrameworkRegistry";
import Playground from "../components/Playground";
import Footer from "../components/Footer";
import {
  STATUTE_ADDRESS,
  CONSUMER_ADDRESS,
  fetchLiveFrameworks,
  fetchLiveVerdicts,
} from "../lib/genlayerClient";

const DEFAULT_FRAMEWORKS: FrameworkData[] = [
  {
    framework_id: "sec-reg-d",
    name: "SEC Regulation D Rule 506(c) Private Offering Framework",
    issuing_authority: "US Securities and Exchange Commission (SEC)",
    description:
      "Permits general solicitation and advertising provided that all purchasers are accredited investors and reasonable steps are taken to verify accreditation.",
    document_urls: [
      "https://www.sec.gov/education/capitalraising/building-blocks/regulation-d",
    ],
    jurisdictions: ["US"],
    verdict_validity_seconds: 2592000,
  },
  {
    framework_id: "mica-art16",
    name: "MiCA Title II Public Offering & Admission Framework",
    issuing_authority: "European Securities and Markets Authority (ESMA)",
    description:
      "Regulates public offers of crypto assets other than asset referenced tokens or e-money tokens, whitepaper requirements, and retail exemptions.",
    document_urls: [
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114",
    ],
    jurisdictions: ["EU", "DE", "FR", "IT", "ES", "NL", "IE"],
    verdict_validity_seconds: 2592000,
  },
  {
    framework_id: "mas-dpt-act",
    name: "MAS Digital Payment Token Services & AML Framework",
    issuing_authority: "Monetary Authority of Singapore (MAS)",
    description:
      "Payment Services Act and Guidelines on Digital Payment Token Services covering AML/CFT travel rule compliance, token issuance, and risk warnings.",
    document_urls: [
      "https://www.mas.gov.sg/regulation/guidelines/guidelines-on-digital-payment-token-services",
    ],
    jurisdictions: ["SG"],
    verdict_validity_seconds: 2592000,
  },
];

export default function HomePage() {
  const [frameworks, setFrameworks] = useState<FrameworkData[]>(DEFAULT_FRAMEWORKS);
  const [verdicts, setVerdicts] = useState<VerdictItem[]>([]);
  const [loadingVerdicts, setLoadingVerdicts] = useState(true);
  const [selectedHash, setSelectedHash] = useState<string>("");

  const loadFrameworks = async () => {
    try {
      const res = await fetch("/api/frameworks");
      if (res.ok) {
        const data = await res.json();
        if (data.frameworks && data.frameworks.length > 0) {
          setFrameworks(data.frameworks);
          return;
        }
      }
    } catch {
      // Backend not reached, fall back to direct on-chain query
    }

    try {
      const onChain = await fetchLiveFrameworks();
      if (onChain && onChain.length > 0) {
        setFrameworks(onChain as unknown as FrameworkData[]);
      }
    } catch {
      // Use defaults
    }
  };

  const loadVerdicts = async () => {
    setLoadingVerdicts(true);
    try {
      const res = await fetch("/api/verdicts?limit=30");
      if (res.ok) {
        const data = await res.json();
        if (data.verdicts && data.verdicts.length > 0) {
          setVerdicts(data.verdicts);
          setLoadingVerdicts(false);
          return;
        }
      }
    } catch {
      // Backend not reached, fall back to direct on-chain query
    }

    try {
      const onChain = await fetchLiveVerdicts(30);
      if (onChain && onChain.length > 0) {
        setVerdicts(onChain as unknown as VerdictItem[]);
      }
    } catch {
      // Use defaults
    } finally {
      setLoadingVerdicts(false);
    }
  };

  useEffect(() => {
    loadFrameworks();
    loadVerdicts();
  }, []);

  const handleVerdictCreated = (newVerdict: any) => {
    const formattedItem: VerdictItem = {
      verdict_id: newVerdict.verdictId,
      action_id: newVerdict.actionId || "action-custom",
      action_hash: newVerdict.actionHash,
      action_title: newVerdict.actionTitle || newVerdict.actionId,
      action_description: newVerdict.reasoning,
      framework_id: newVerdict.frameworkId,
      verdict: newVerdict.verdict,
      confidence_score: newVerdict.confidenceScore,
      applicable_clauses: newVerdict.applicableClauses,
      conditions: newVerdict.conditions,
      reasoning: newVerdict.reasoning,
      risk_factors: newVerdict.riskFactors,
      adjudicated_at: Math.floor(Date.now() / 1000),
      expires_at: Number(newVerdict.expiresAt) || Math.floor(Date.now() / 1000) + 2592000,
      is_compliant: newVerdict.isCompliant,
      is_expired: newVerdict.isExpired,
      tx_hash: newVerdict.txHash,
    };

    setVerdicts((prev) => [formattedItem, ...prev]);
    setSelectedHash(newVerdict.actionHash);
  };

  const handleScrollToAdjudicate = () => {
    const el = document.getElementById("adjudicate");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectActionHash = (hash: string) => {
    setSelectedHash(hash);
    const el = document.getElementById("playground");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f9fc] dark:bg-[#001525] transition-colors duration-200">
      <Header />

      <main className="flex-grow">
        <Hero
          frameworkCount={frameworks.length}
          verdictCount={verdicts.length}
          onAdjudicateClick={handleScrollToAdjudicate}
        />

        <AdjudicationStudio
          frameworks={frameworks}
          onVerdictCreated={handleVerdictCreated}
          onVerifyInPlayground={handleSelectActionHash}
        />

        <VerdictsFeed
          verdicts={verdicts}
          loading={loadingVerdicts}
          onRefresh={loadVerdicts}
          onSelectActionHash={handleSelectActionHash}
        />

        <FrameworkRegistry
          frameworks={frameworks}
          loading={false}
          onFrameworkAdded={loadFrameworks}
        />

        <Playground
          selectedHash={selectedHash}
          statuteAddress={STATUTE_ADDRESS}
          consumerAddress={CONSUMER_ADDRESS}
        />
      </main>

      <Footer
        statuteAddress={STATUTE_ADDRESS}
        consumerAddress={CONSUMER_ADDRESS}
      />
    </div>
  );
}
