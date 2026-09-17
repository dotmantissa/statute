"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";

interface ThemeContextType {
  theme: "dark" | "light";
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
});

export const useTheme = () => useContext(ThemeContext);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("statute_theme");
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
        document.documentElement.classList.toggle("dark", stored === "dark");
      } else {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      }
    } catch {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("statute_theme", next);
    } catch {
      // ignore storage error
    }
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const isDark = theme === "dark";
  const privyAppId =
    process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmu3xw9hq003b0cjmpt2ibr7f";

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      <PrivyProvider
        appId={privyAppId}
        config={{
          appearance: {
            theme: isDark ? "dark" : "light",
            accentColor: "#26ccf0",
            logo: "/icon.svg",
          },
          loginMethods: ["email"],
        }}
      >
        <div className={mounted ? "" : "opacity-0"}>{children}</div>
      </PrivyProvider>
    </ThemeContext.Provider>
  );
}
