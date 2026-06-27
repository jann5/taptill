"use client";

import { useMemo } from "react";
import { useTaptillStore } from "@/features/workspace/state/taptill-store";

export function DaySummaryScreen() {
  const { clearSales, sales, settings } = useTaptillStore();

  const totalSales = sales.reduce((sum, sale) => sum + sale.totalCents, 0);
  const transactionCount = sales.length;
  const averageCents =
    transactionCount > 0 ? Math.round(totalSales / transactionCount) : 0;
  const cashInDrawer = settings.startingCashCents + totalSales;

  const topItems = useMemo(() => {
    const itemsMap = new Map<
      string,
      { name: string; revenueCents: number; sold: number }
    >();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existingItem = itemsMap.get(item.productId) ?? {
          name: item.productName,
          revenueCents: 0,
          sold: 0,
        };

        itemsMap.set(item.productId, {
          name: item.productName,
          revenueCents:
            existingItem.revenueCents + item.quantity * item.unitPriceCents,
          sold: existingItem.sold + item.quantity,
        });
      }
    }

    return [...itemsMap.values()]
      .sort((left, right) => right.sold - left.sold)
      .slice(0, 6);
  }, [sales]);

  const recentSales = sales.slice(0, 12).map((sale) => ({
    amount: formatMoney(sale.totalCents),
    label: sale.items.map((item) => `${item.productName} x${item.quantity}`).join(", "),
    time: sale.createdAtLabel,
  }));

  const dayMetrics = [
    { label: "Sprzedaż", value: formatMoney(totalSales) },
    { label: "Transakcje", value: String(transactionCount) },
    { label: "Średnio", value: formatMoney(averageCents) },
    { label: "Gotówka", value: formatMoney(cashInDrawer) },
  ];

  const cashRows = [
    { label: "Start dnia", value: formatMoney(settings.startingCashCents) },
    { label: "Sprzedaż", value: formatMoney(totalSales) },
    { label: "Powinno być", value: formatMoney(cashInDrawer) },
  ];

  return (
    <div className="h-full overflow-auto bg-surface-subtle px-4 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto flex min-h-full max-w-[1620px] flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
            <h2 className="text-[28px] font-black tracking-[-0.07em] text-slate-950 sm:text-[34px]">
              Dzień
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              {formatDate(new Date())}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (sales.length === 0) {
                return;
              }

              if (!window.confirm("Zamknąć dzień i wyczyścić sprzedaż?")) {
                return;
              }

              clearSales();
            }}
            className="min-h-[52px] rounded-full bg-black px-5 text-[15px] font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] disabled:opacity-40"
            disabled={sales.length === 0}
          >
            Zamknij dzień
          </button>
        </header>

        <section className="rounded-[32px] bg-black px-5 py-5 text-white shadow-[0_20px_44px_rgba(0,0,0,0.16)] sm:px-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dayMetrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`space-y-2 ${index > 0 ? "xl:border-l xl:border-white/10 xl:pl-6" : ""}`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/54">
                  {metric.label}
                </p>
                <p className="text-[34px] font-black leading-none tracking-[-0.08em]">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-[32px] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)] sm:px-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <h3 className="text-[24px] font-black tracking-[-0.06em] text-slate-950">
                Ostatnie sprzedaże
              </h3>
              <span className="text-sm font-semibold text-slate-500">najnowsze</span>
            </div>

            {recentSales.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {recentSales.map((sale) => (
                  <div
                    key={`${sale.time}-${sale.label}`}
                    className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 py-4"
                  >
                    <div className="text-[17px] font-black tracking-[-0.05em] text-slate-950">
                      {sale.time}
                    </div>
                    <p className="truncate text-[18px] font-black tracking-[-0.04em] text-slate-950">
                      {sale.label}
                    </p>
                    <div className="text-[18px] font-black tracking-[-0.04em] text-slate-950">
                      {sale.amount}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[240px] items-center justify-center text-center">
                <p className="text-[20px] font-black tracking-[-0.04em] text-slate-950">
                  Brak sprzedaży
                </p>
              </div>
            )}
          </section>

          <div className="space-y-4">
            <section className="rounded-[32px] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)] sm:px-6">
              <h3 className="border-b border-slate-200 pb-4 text-[24px] font-black tracking-[-0.06em] text-slate-950">
                Top produkty
              </h3>

              {topItems.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {topItems.map((item) => (
                    <div
                      key={item.name}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="text-[18px] font-black tracking-[-0.04em] text-slate-950">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {item.sold} szt.
                        </p>
                      </div>
                      <div className="text-[18px] font-black tracking-[-0.04em] text-slate-950">
                        {formatMoney(item.revenueCents)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-[18px] font-black tracking-[-0.04em] text-slate-950">
                    Brak danych
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-[32px] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)] sm:px-6">
              <h3 className="border-b border-slate-200 pb-4 text-[24px] font-black tracking-[-0.06em] text-slate-950">
                Gotówka
              </h3>

              <div className="divide-y divide-slate-200">
                {cashRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 py-4 text-[18px] font-black"
                  >
                    <span className="text-slate-500">{row.label}</span>
                    <span className="text-slate-950">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatMoney(cents: number) {
  return `${new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)} zł`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
