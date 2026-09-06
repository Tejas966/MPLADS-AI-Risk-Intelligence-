"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname.startsWith(path);
  };

  const NavItem = ({ href, icon, label, badge, alert }: { href: string, icon: string, label: string, badge?: string, alert?: boolean }) => {
    const active = isActive(href);
    return (
      <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[0.85rem] font-medium transition-colors mb-[1px] ${
        active 
          ? "bg-brand text-white" 
          : "text-foreground bg-transparent hover:bg-surface-secondary"
      }`}>
        <i className={`${icon} w-[18px] text-[0.95rem] ${active ? "text-white" : "text-foreground-secondary group-hover:text-brand"}`}></i>
        <span>{label}</span>
        {badge && (
          <span className={`ml-auto text-[0.55rem] px-2.5 py-[1px] rounded-full font-semibold ${
            alert ? "bg-brand text-white" : active ? "bg-white/20 text-white" : "bg-border text-foreground-secondary"
          }`}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="w-[220px] bg-surface border-r border-border p-4 flex-shrink-0 transition-colors overflow-y-auto hidden md:flex flex-col">
      <nav className="flex-1">
        <div className="text-[0.55rem] uppercase tracking-[0.8px] text-foreground-secondary font-semibold pt-2.5 pb-1 pl-2">Main</div>
        <NavItem href="/" icon="fas fa-chart-pie" label="Dashboard" badge="Live" />
        <NavItem href="/map" icon="fas fa-map-marked-alt" label="Risk Map" />
        <NavItem href="/projects" icon="fas fa-list-check" label="Projects" badge="12k" />
        <NavItem href="/alerts" icon="fas fa-exclamation-triangle" label="Alerts" badge="12" alert />

        <div className="text-[0.55rem] uppercase tracking-[0.8px] text-foreground-secondary font-semibold pt-2.5 pb-1 pl-2 mt-2">Analysis</div>
        <NavItem href="/cost" icon="fas fa-coins" label="Cost Anomalies" badge="193" />
        <NavItem href="/delayed" icon="fas fa-clock" label="Delayed" badge="812" />
        <NavItem href="/duplicates" icon="fas fa-copy" label="Duplicates" badge="47" />

        <div className="text-[0.55rem] uppercase tracking-[0.8px] text-foreground-secondary font-semibold pt-2.5 pb-1 pl-2 mt-2">Reports</div>
        <NavItem href="/export" icon="fas fa-file-pdf" label="Export" />
        <NavItem href="/settings" icon="fas fa-sliders-h" label="Settings" />
      </nav>

      <div className="border-t border-border pt-4 mt-4">
        <button className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface-secondary w-full text-left transition-colors hover:bg-border border-none cursor-pointer">
            <i className="fas fa-user-circle text-[1.6rem] text-foreground-secondary"></i>
            <div>
                <div className="font-semibold text-[0.8rem] text-foreground">Admin User</div>
                <div className="text-[0.6rem] text-foreground-secondary">MoSPI · DIIID</div>
            </div>
        </button>
        <button className="mt-2 p-2 rounded-xl border border-border bg-transparent w-full font-semibold text-brand cursor-pointer transition-colors text-[0.8rem] flex items-center justify-center gap-1.5 hover:bg-risk-high-bg hover:border-brand">
            <i className="fas fa-sign-out-alt"></i> <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}