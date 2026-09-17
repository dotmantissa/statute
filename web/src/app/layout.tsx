import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Statute: Autonomous Regulatory Compliance Adjudicator",
  description:
    "Decentralized regulatory verification for on-chain protocols. Validators verify published statutory guidance and render consensus verdicts with cryptographic integrity.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen selection:bg-[#26ccf0]/20 selection:text-[#26ccf0]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
