"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function TopHeader() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <header className="bg-surface border-b-2 border-border py-3 px-8 flex justify-between items-center sticky top-0 z-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="bg-brand w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl">
          <i className="fas fa-robot"></i>
        </div>
        <div>
          <h1 className="text-[1.1rem] font-bold text-foreground leading-tight">
            MPLADS <span className="text-brand">AI</span> Risk Intelligence
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] font-bold text-brand tracking-wider uppercase bg-brand/10 px-1.5 py-0.2 rounded">Team Vanguard</span>
            <span className="text-[0.6rem] text-foreground-secondary">· SIH 2026</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <select className="px-3.5 py-1.5 rounded-full border border-border bg-surface-secondary text-foreground text-[0.8rem] font-sans cursor-pointer focus:outline-none focus:border-brand">
            <option value="citizen">👤 Citizen</option>
            <option value="mp">🏛️ MP</option>
            <option value="district">🏢 District Authority</option>
            <option value="ministry">🇮🇳 Ministry</option>
        </select>
        
        <input type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="px-2.5 py-1 rounded-full border border-border bg-surface-secondary text-foreground text-[0.75rem] font-sans outline-none hidden md:block" />
        
        <button className="bg-surface border border-border w-[38px] h-[38px] rounded-full flex items-center justify-center text-foreground cursor-pointer transition-colors hover:border-brand hover:text-brand relative" title="Alerts">
            <i className="far fa-bell"></i>
            <span className="absolute top-[6px] right-[6px] w-2 h-2 bg-risk-high rounded-full border-2 border-surface"></span>
            <span className="absolute -top-[4px] -right-[4px] bg-brand text-white text-[0.55rem] font-bold px-[7px] py-[2px] rounded-full border-2 border-surface">12</span>
        </button>
        <button onClick={toggleTheme} className="bg-surface border border-border w-[38px] h-[38px] rounded-full flex items-center justify-center text-foreground cursor-pointer transition-colors hover:border-brand hover:text-brand" title="Toggle Theme">
            <i className={theme === "light" ? "fas fa-moon" : "fas fa-sun"}></i>
        </button>
        <button className="bg-brand w-[38px] h-[38px] rounded-full flex items-center justify-center text-white cursor-pointer transition-colors border-none" title="Refresh Data">
            <i className="fas fa-sync-alt"></i>
        </button>
      </div>
    </header>
  );
}