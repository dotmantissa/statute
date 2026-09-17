import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export default function Logo({ size = 38, className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="logoCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5ee1ff" />
            <stop offset="100%" stopColor="#26ccf0" />
          </linearGradient>
          <linearGradient id="logoNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00182b" />
            <stop offset="100%" stopColor="#002139" />
          </linearGradient>
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <rect width="128" height="128" rx="28" fill="url(#logoNavyGrad)" />
        <rect
          x="2"
          y="2"
          width="124"
          height="124"
          rx="26"
          fill="none"
          stroke="#26ccf0"
          strokeWidth="2.5"
          strokeOpacity="0.35"
        />

        <circle cx="64" cy="24" r="3" fill="#26ccf0" fillOpacity="0.6" />
        <circle cx="28" cy="74" r="2.5" fill="#26ccf0" fillOpacity="0.4" />
        <circle cx="100" cy="74" r="2.5" fill="#26ccf0" fillOpacity="0.4" />

        <path d="M62 34 L66 34 L65 96 L63 96 Z" fill="#ffffff" fillOpacity="0.95" />
        <rect x="46" y="96" width="36" height="5" rx="2" fill="#ffffff" />
        <rect x="40" y="101" width="48" height="4" rx="2" fill="url(#logoCyanGrad)" />

        <polygon points="64,28 70,36 64,44 58,36" fill="url(#logoCyanGrad)" filter="url(#logoGlow)" />
        <circle cx="64" cy="36" r="2" fill="#002139" />

        <path d="M26 44 Q64 41 102 44" fill="none" stroke="url(#logoCyanGrad)" strokeWidth="4.5" strokeLinecap="round" />

        <line x1="28" y1="45" x2="16" y2="72" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.85" />
        <line x1="28" y1="45" x2="40" y2="72" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.85" />
        <path d="M12 72 Q28 84 44 72 Z" fill="url(#logoCyanGrad)" />
        <circle cx="28" cy="73" r="3.5" fill="#ffffff" />

        <line x1="100" y1="45" x2="88" y2="72" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.85" />
        <line x1="100" y1="45" x2="112" y2="72" stroke="#ffffff" strokeWidth="1.8" strokeOpacity="0.85" />
        <path d="M84 72 Q100 84 116 72 Z" fill="url(#logoCyanGrad)" />
        <circle cx="100" cy="73" r="3.5" fill="#ffffff" />

        <line x1="28" y1="73" x2="64" y2="98" stroke="#26ccf0" strokeWidth="1.2" strokeDasharray="2,2" strokeOpacity="0.45" />
        <line x1="100" y1="73" x2="64" y2="98" stroke="#26ccf0" strokeWidth="1.2" strokeDasharray="2,2" strokeOpacity="0.45" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold tracking-tight text-white font-serif">
              STATUTE
            </span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#26ccf0]/15 text-[#26ccf0] border border-[#26ccf0]/30 tracking-wider uppercase">
              Consensus
            </span>
          </div>
          <span className="text-[10px] text-[#89b4c8] font-medium tracking-wide mt-0.5">
            Regulatory Compliance Adjudicator
          </span>
        </div>
      )}
    </div>
  );
}
