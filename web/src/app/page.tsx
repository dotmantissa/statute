"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import AdjudicationStudio from "../components/AdjudicationStudio";
import VerdictsFeed, { VerdictItem } from "../components/VerdictsFeed";
import FrameworkRegistry, { FrameworkData } from "../components/FrameworkRegistry";
import Playground from "../components/Playground";
import Footer from "../components/Footer";

const STATUTE_ADDRESS =
  process.env.NEXT_PUBLIC_STATUTE_ADDRESS || "0xa7F7e471d31c0f90A55A73D09CA06f0aD811D84e";
const CONSUMER_ADDRESS =
  process.env.NEXT_PUBLIC_CONSUMER_ADDRESS || "0xd084F4f579FC9BCB12baf5fEcfF4bF356178AA10";

const DEFAULT_FRAMEWORKS: FrameworkData[] = [
  {
    framework_id: "sec-reg-d",
    name: "SEC Regulation D (Rules 504, 506b, 506c)",
    issuing_authority: "US Securities and Exchange Commission",
    description:
      "Exemption framework for private placements, accredited investor requirements, and resale restrictions for digital asset securities.",
    document_urls: ["https://www.sec.gov/education/smallbusiness/exemptofferings/regdoffering"],
    jurisdictions: ["US"],
    verdict_validity_seconds: 2592000,
  },
  {
    framework_id: "mica-2023",
    name: "EU Markets in Crypto Assets Regulation (MiCA)",
    issuing_authority: "European Parliament & Council",
    description:
      "Comprehensive regulatory regime for crypto asset service providers, asset referenced tokens, and electronic money tokens in the European Union.",
    document_urls: ["https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114"],
    jurisdictions: ["EU"],
    verdict_validity_seconds: 5184000,
  },
  {
    framework_id: "mas-dpt-2020",
    name: "MAS Digital Payment Token Regulatory Guidance",
    issuing_authority: "Monetary Authority of Singapore",
    description:
      "Statutory guidelines for digital payment token services, custody segregation, consumer protection, and technology risk management.",
    document_urls: ["https://www.mas.gov.sg/regulation/guidelines/guidelines-on-provision-of-digital-payment-token-services-to-the-public"],
    jurisdictions: ["SG"],
    verdict_validity_seconds: 2592000,
  },
];

const DEFAULT_VERDICTS: VerdictItem[] = [
  {
    verdict_id: "verd-rwa-sec-demo-01",
    action_id: "rwa-accredited-vault-us",
    action_hash: "0x3e18a0a9dc6a94f0685b8c9d46f53a6c579308112c3f81e330dfca62d6411be0",
    action_title: "Tokenized Short Term US Treasury Bill Vault for Verified Accredited Investors",
    action_description:
      "Protocol proposes to issue digital tokenized notes representing beneficial ownership in short dated US Treasury bills under Rule 506c of Regulation D.",
    framework_id: "sec-reg-d",
    verdict: "COMPLIANT",
    confidence_score: 95,
    applicable_clauses: ["Rule 506(c)", "Section 4(a)(2)", "17 CFR 230.501"],
    conditions: [
      "Mandatory third party verification of accredited investor status prior to distribution",
      "One year holding period restriction enforced by on-chain transfer gating",
    ],
    reasoning:
      "The structure strictly adheres to Rule 506c exemptions by excluding non accredited retail participants and enforcing cryptographic transfer locks.",
    adjudicated_at: Math.floor(Date.now() / 1000) - 7200,
    expires_at: Math.floor(Date.now() / 1000) + 2584800,
    is_compliant: true,
    is_expired: false,
    tx_hash: "0x01d32bb1ea60c8f1da05c4c2454e919adf66c01546cd0ccd044cf703cfbee87b",
  },
  {
    verdict_id: "verd-mica-art-demo-02",
    action_id: "mica-art-euro-liquidity",
    action_hash: "0x7a29f8c6b12480e774f358dbb298492040b2a7589d98cf119c8f3818e11a91e4",
    action_title: "Automated Liquidity Pool for Euro Denominated Asset Referenced Token",
    action_description:
      "Decentralized liquidity pool facilitating automated swaps for a Euro denominated asset referenced token issued by an authorized European credit institution.",
    framework_id: "mica-2023",
    verdict: "CAUTION_WITH_CONDITIONS",
    confidence_score: 88,
    applicable_clauses: ["MiCA Title III Art 36", "MiCA Title III Art 38", "MiCA Title VI Art 88"],
    conditions: [
      "Issuer must provide daily public publication of segregated reserve asset attestations",
      "Redemption mechanism must guarantee direct liquidity within two business days",
    ],
    reasoning:
      "Compliant provided that custodian reserves remain segregated in Tier 1 credit institutions and redemption rights are verifiable on-chain.",
    adjudicated_at: Math.floor(Date.now() / 1000) - 28800,
    expires_at: Math.floor(Date.now() / 1000) + 5155200,
    is_compliant: true,
    is_expired: false,
    tx_hash: "0xc93e02e967712402c04f7a7d9675860698a58bdc4b048a4bc54b87bec41e4904",
  },
  {
    verdict_id: "verd-unregulated-dex-03",
    action_id: "unregulated-retail-derivatives-pool",
    action_hash: "0x981bfd237190ca11756f77ec9420556112c37e908da431189ac52277bb0912fa",
    action_title: "Uncollateralized Margin Trading Pool Offered to Unverified Retail Users",
    action_description:
      "Perpetual futures contract pool providing 50x leverage on synthetic commodities without jurisdiction geoblocking or customer identity verification.",
    framework_id: "mas-dpt-2020",
    verdict: "NON_COMPLIANT",
    confidence_score: 98,
    applicable_clauses: ["Section 13 PS Act", "MAS Guidelines on DPT Services Art 4"],
    risk_factors: [
      "Failure to segregate customer margin collateral",
      "Offering prohibited leveraged derivatives to retail participants without licensing",
    ],
    reasoning:
      "Action directly violates core statutory investor protection mandates and lacks required capital markets services licensing.",
    adjudicated_at: Math.floor(Date.now() / 1000) - 86400,
    expires_at: Math.floor(Date.now() / 1000) + 2505600,
    is_compliant: false,
    is_expired: false,
    tx_hash: "0x25a371c828bf74910ea0984112e4587814cb20791b45281e550c8227b6829103",
  },
];

export default function HomePage() {
  const [frameworks, setFrameworks] = useState<FrameworkData[]>(DEFAULT_FRAMEWORKS);
  const [verdicts, setVerdicts] = useState<VerdictItem[]>(DEFAULT_VERDICTS);
  const [loadingVerdicts, setLoadingVerdicts] = useState(false);
  const [selectedHash, setSelectedHash] = useState<string>("");

  const loadFrameworks = async () => {
    try {
      const res = await fetch("/api/frameworks");
      if (res.ok) {
        const data = await res.json();
        if (data.frameworks && data.frameworks.length > 0) {
          setFrameworks(data.frameworks);
        }
      }
    } catch {
      // Use defaults if backend unavailable
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
        }
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
