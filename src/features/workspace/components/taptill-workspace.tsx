"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Grid2X2,
  Settings2,
  ShoppingCart,
} from "lucide-react";
import { DaySummaryScreen } from "@/features/day/components/day-summary-screen";
import { TapTillSalesScreen } from "@/features/sales/components/taptill-sales-screen";
import { SettingsScreen } from "@/features/settings/components/settings-screen";
import { TileManagementScreen } from "@/features/tiles/components/tile-management-screen";
import { TaptillProvider } from "@/features/workspace/state/taptill-store";

type ScreenId = "sales" | "tiles" | "day" | "settings";

type ScreenTab = {
  id: ScreenId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

const screenTabs: ScreenTab[] = [
  {
    id: "sales",
    label: "Sprzedaż",
    shortLabel: "Sprzedaż",
    icon: ShoppingCart,
  },
  {
    id: "tiles",
    label: "Kafelki",
    shortLabel: "Kafelki",
    icon: Grid2X2,
  },
  {
    id: "day",
    label: "Dzień",
    shortLabel: "Dzień",
    icon: CalendarDays,
  },
  {
    id: "settings",
    label: "Ust.",
    shortLabel: "Ust.",
    icon: Settings2,
  },
];

export function TaptillWorkspace() {
  return (
    <TaptillProvider>
      <WorkspaceChrome />
    </TaptillProvider>
  );
}

function WorkspaceChrome() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("sales");
  const [salesFullscreen, setSalesFullscreen] = useState(false);
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const salesInFullscreen = activeScreen === "sales" && salesFullscreen;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClock(formatClock(new Date()));
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSalesFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleToggleSalesFullscreen = () => {
    if (activeScreen !== "sales") {
      setActiveScreen("sales");
    }

    setSalesFullscreen((current) => !current);
  };

  const handleSelectScreen = (screenId: ScreenId) => {
    if (screenId !== "sales" && salesFullscreen) {
      setSalesFullscreen(false);
    }

    setActiveScreen(screenId);
  };

  return (
    <main className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-[clamp(60px,7vh,72px)] shrink-0 items-center justify-between border-b border-border bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="min-w-0">
            <h1 className="text-[24px] font-black uppercase tracking-[-0.075em] text-slate-950 sm:text-[30px]">
              TAPTILL
            </h1>
          </div>
        </div>

        <div className="text-[22px] font-bold tracking-[-0.05em] text-slate-800 sm:text-[24px]">
          {clock}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[92px_minmax(0,1fr)]">
        <aside className="border-b border-border/70 bg-white md:border-r md:border-b-0">
          <nav className="flex gap-2 overflow-x-auto px-2 py-2 md:h-full md:flex-col md:overflow-visible md:px-2 md:py-4">
            {screenTabs.map((tab) => (
              <ChromeNavButton
                key={tab.id}
                tab={tab}
                active={tab.id === activeScreen}
                onSelect={() => handleSelectScreen(tab.id)}
              />
            ))}
          </nav>
        </aside>

        <section
          className={
            salesInFullscreen
              ? "fixed inset-0 z-50 h-dvh min-h-dvh w-screen overflow-hidden bg-background"
              : "min-h-0 overflow-hidden"
          }
        >
          {activeScreen === "sales" ? (
            <TapTillSalesScreen
              isFullscreen={salesInFullscreen}
              onToggleFullscreen={handleToggleSalesFullscreen}
            />
          ) : null}
          {activeScreen === "tiles" ? <TileManagementScreen /> : null}
          {activeScreen === "day" ? <DaySummaryScreen /> : null}
          {activeScreen === "settings" ? <SettingsScreen /> : null}
        </section>
      </div>
    </main>
  );
}

function BrandMark() {
  return (
    <div className="grid h-[44px] w-[44px] grid-cols-2 gap-[3px] rounded-[14px] border border-slate-900 bg-[#151a28] p-[6px] shadow-[0_10px_22px_rgba(21,26,40,0.16)]">
      <span className="rounded-[4px] bg-white/95" />
      <span className="rounded-[4px] bg-white/82" />
      <span className="rounded-[4px] bg-white/74" />
      <span className="rounded-[6px] bg-[#4c8cff]" />
    </div>
  );
}

function ChromeNavButton({
  tab,
  active,
  onSelect,
}: {
  tab: ScreenTab;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex min-w-[82px] shrink-0 touch-manipulation items-center justify-center gap-2 rounded-[20px] px-3 py-3 text-center transition md:min-h-[78px] md:flex-col ${
        active
          ? "bg-black text-white shadow-[0_16px_30px_rgba(0,0,0,0.16)]"
          : "bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      <Icon className={`h-6 w-6 ${active ? "text-white" : "text-slate-600"}`} />
      <span className="text-[12px] font-bold tracking-[-0.02em] md:text-[13px]">
        {tab.shortLabel}
      </span>
    </button>
  );
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
