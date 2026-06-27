"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useTaptillStore } from "@/features/workspace/state/taptill-store";
import type { OrderItems, Product } from "@/features/sales/types";

type SaleSnapshot = {
  customAmount: string;
  orderItems: OrderItems;
  selectedPreset: null | number;
  tenderedCents: null | number;
};

type CashFeedback = {
  amount: number;
  nonce: number;
  preset: number;
};

export function TapTillSalesScreen({
  isFullscreen,
  onToggleFullscreen,
}: {
  isFullscreen: boolean;
  onToggleFullscreen: () => void | Promise<void>;
}) {
  const { addSale, categoryTabs, products, sales, settings } = useTaptillStore();
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItems>({});
  const [tenderedCents, setTenderedCents] = useState<null | number>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<null | number>(null);
  const [history, setHistory] = useState<SaleSnapshot[]>([]);
  const [settledToast, setSettledToast] = useState<string | null>(null);
  const [cashFeedback, setCashFeedback] = useState<CashFeedback | null>(null);
  const cashFeedbackNonceRef = useRef(0);

  useEffect(() => {
    if (!settledToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSettledToast(null);
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [settledToast]);

  useEffect(() => {
    if (!cashFeedback) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCashFeedback(null);
    }, 720);

    return () => window.clearTimeout(timeoutId);
  }, [cashFeedback]);

  const visibleCategoryTabs = categoryTabs.filter((category) => category.id !== "all");

  const effectiveCategoryId = visibleCategoryTabs.some(
    (category) => category.id === activeCategoryId,
  )
    ? activeCategoryId
    : "";

  const visibleProducts = effectiveCategoryId
    ? products.filter((product) => product.categoryId === effectiveCategoryId)
    : products;

  const selectedProducts = useMemo(
    () => products.filter((product) => !product.isSpacer && orderItems[product.id] > 0),
    [orderItems, products],
  );
  const totalItems = selectedProducts.reduce(
    (sum, product) => sum + (orderItems[product.id] ?? 0),
    0,
  );
  const totalCents = selectedProducts.reduce(
    (sum, product) => sum + product.priceCents * (orderItems[product.id] ?? 0),
    0,
  );
  const changeCents = tenderedCents === null ? null : tenderedCents - totalCents;
  const missingCents =
    changeCents !== null && changeCents < 0 ? Math.abs(changeCents) : 0;
  const canSettle = totalCents > 0 && changeCents !== null && changeCents >= 0;
  const hasSaleInProgress =
    totalItems > 0 || tenderedCents !== null || customAmount.length > 0;

  const rememberCurrentState = () => {
    setHistory((currentHistory) => [
      ...currentHistory.slice(-23),
      {
        customAmount,
        orderItems: { ...orderItems },
        selectedPreset,
        tenderedCents,
      },
    ]);
  };

  const restoreSnapshot = (snapshot: SaleSnapshot) => {
    setOrderItems(snapshot.orderItems);
    setTenderedCents(snapshot.tenderedCents);
    setCustomAmount(snapshot.customAmount);
    setSelectedPreset(snapshot.selectedPreset);
    setCashFeedback(null);
  };

  const handleAddProduct = (productId: string, quantity = 1) => {
    rememberCurrentState();
    setOrderItems((currentOrder) => ({
      ...currentOrder,
      [productId]: (currentOrder[productId] ?? 0) + quantity,
    }));
  };

  const handleChangeQuantity = (productId: string, delta: 1 | -1) => {
    if ((orderItems[productId] ?? 0) === 0) {
      return;
    }

    rememberCurrentState();
    setOrderItems((currentOrder) => {
      const nextQuantity = (currentOrder[productId] ?? 0) + delta;

      if (nextQuantity <= 0) {
        const nextOrder = { ...currentOrder };
        delete nextOrder[productId];
        return nextOrder;
      }

      return {
        ...currentOrder,
        [productId]: nextQuantity,
      };
    });
  };

  const handleSelectPreset = (amount: number) => {
    rememberCurrentState();
    const nextAmount = (tenderedCents ?? 0) + amount;

    setTenderedCents(nextAmount);
    setSelectedPreset(amount);
    setCustomAmount(formatTenderedInput(nextAmount));
    cashFeedbackNonceRef.current += 1;
    setCashFeedback({
      amount,
      nonce: cashFeedbackNonceRef.current,
      preset: amount,
    });
  };

  const handleCustomAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    rememberCurrentState();
    const nextValue = normalizeCurrencyInput(event.target.value);
    const nextTendered = parseCurrencyToCents(nextValue);

    setCustomAmount(nextValue);
    setTenderedCents(nextTendered);
    setSelectedPreset(
      nextTendered !== null && settings.cashPresets.includes(nextTendered)
        ? nextTendered
        : null,
    );
    setCashFeedback(null);
  };

  const handleResetTendered = () => {
    if (tenderedCents === null && customAmount.length === 0) {
      return;
    }

    rememberCurrentState();
    setTenderedCents(null);
    setCustomAmount("");
    setSelectedPreset(null);
    setCashFeedback(null);
  };

  const handleUndo = () => {
    const snapshot = history.at(-1);

    if (!snapshot) {
      return;
    }

    restoreSnapshot(snapshot);
    setHistory((currentHistory) => currentHistory.slice(0, -1));
  };

  const handleClear = () => {
    if (!hasSaleInProgress) {
      return;
    }

    rememberCurrentState();
    setOrderItems({});
    setTenderedCents(null);
    setCustomAmount("");
    setSelectedPreset(null);
    setCashFeedback(null);
  };

  const handleSettle = () => {
    if (!canSettle || tenderedCents === null || changeCents === null) {
      return;
    }

    const now = new Date();

    addSale({
      changeCents,
      createdAtIso: now.toISOString(),
      createdAtLabel: formatClock(now),
      items: selectedProducts.map((product) => ({
        productId: product.id,
        productName: product.name,
        quantity: orderItems[product.id] ?? 0,
        unitPriceCents: product.priceCents,
      })),
      tenderedCents,
      totalCents,
    });

    setOrderItems({});
    setTenderedCents(null);
    setCustomAmount("");
    setSelectedPreset(null);
    setCashFeedback(null);
    setHistory([]);
    setSettledToast(`Gotowe • ${formatMoneyWithCurrency(totalCents)}`);
  };

  return (
    <>
      <div className="h-full overflow-auto lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(330px,382px)] lg:overflow-hidden">
        <CatalogPane
          categoryTabs={visibleCategoryTabs}
          effectiveCategoryId={effectiveCategoryId}
          fullscreen={isFullscreen}
          onSelectCategory={(categoryId) =>
            setActiveCategoryId((currentCategoryId) =>
              currentCategoryId === categoryId ? "" : categoryId,
            )
          }
          onToggleFullscreen={() => void onToggleFullscreen()}
          orderItems={orderItems}
          products={visibleProducts}
          onAddProduct={handleAddProduct}
        />

        <aside className="min-h-0 bg-panel lg:overflow-y-auto">
          <div className="grid min-h-full min-w-0 grid-rows-[auto_minmax(0,1fr)_auto_auto]">
            <div className="border-b border-border bg-white px-4 py-[clamp(12px,1.5vh,18px)] sm:px-5">
              <h2 className="text-[clamp(1.45rem,2vh,1.85rem)] font-black tracking-[-0.06em] text-slate-950">
                Zamówienie
              </h2>
            </div>

            <div className="min-h-0 overflow-auto border-b border-border bg-white px-4 py-[clamp(10px,1.5vh,14px)] sm:px-5">
              {selectedProducts.length === 0 ? (
                <div className="flex min-h-[84px] items-center justify-center rounded-[18px] border border-dashed border-slate-300 bg-slate-50/80 px-5 text-center">
                  <p className="text-[16px] font-black tracking-[-0.04em] text-slate-950 sm:text-[18px]">
                    Brak pozycji
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedProducts.map((product) => (
                    <OrderRow
                      key={product.id}
                      product={product}
                      quantity={orderItems[product.id] ?? 0}
                      onDecrease={() => handleChangeQuantity(product.id, -1)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2.5 border-b border-border bg-panel px-4 py-[clamp(10px,1.5vh,14px)] sm:px-5">
              <div className="flex items-end justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-[16px] font-black tracking-[-0.04em] text-slate-600 sm:text-[18px]">
                    Suma
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted sm:text-[15px]">
                    {totalItems === 0
                      ? "Brak pozycji"
                      : `${totalItems} ${
                          totalItems === 1 ? "pozycja" : "pozycje"
                        } w zamówieniu`}
                  </p>
                </div>
                <div className="shrink-0 text-right text-[clamp(2.5rem,5.2vh,3.9rem)] font-black leading-none tracking-[-0.08em] text-slate-950">
                  {formatMoneyWithCurrency(totalCents)}
                </div>
              </div>

              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(
                    settings.cashPresets.length,
                    1,
                  )}, minmax(0, 1fr))`,
                }}
              >
                {settings.cashPresets.map((preset) => (
                  <CashPresetButton
                    key={
                      cashFeedback?.preset === preset
                        ? `${preset}-${cashFeedback.nonce}`
                        : `${preset}-idle`
                    }
                    active={selectedPreset === preset}
                    amount={preset}
                    animated={cashFeedback?.preset === preset}
                    onClick={() => handleSelectPreset(preset)}
                  />
                ))}
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-bold tracking-[0.16em] text-muted sm:text-sm">
                  Klient dał
                </span>
                <div className="relative">
                  {cashFeedback ? (
                    <div
                      key={cashFeedback.nonce}
                      className="pointer-events-none absolute -top-3 right-4 z-10 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-black tracking-[0.08em] text-success shadow-[0_10px_22px_rgba(15,23,42,0.14)]"
                      style={{ animation: "cash-chip-rise 720ms ease-out forwards" }}
                    >
                      +{formatMoney(cashFeedback.amount)} zł
                    </div>
                  ) : null}

                  <div
                    className="flex min-h-[clamp(60px,7.5vh,70px)] items-center rounded-[20px] border border-border bg-white px-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] sm:px-5"
                    style={
                      cashFeedback
                        ? { animation: "cash-field-flash 340ms ease-out" }
                        : undefined
                    }
                  >
                    <input
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="w-full border-none bg-transparent text-right text-[clamp(1.7rem,3.7vh,2.15rem)] font-black tracking-[-0.06em] text-slate-950 outline-none"
                    />
                    {tenderedCents !== null || customAmount.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleResetTendered}
                        aria-label="Wyczyść kwotę klienta"
                        className="ml-3 flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                    <span className="ml-3 text-[17px] font-black text-slate-700 sm:text-[18px]">
                      zł
                    </span>
                  </div>
                </div>
              </label>

              <ChangeCard
                totalCents={totalCents}
                tenderedCents={tenderedCents}
                changeCents={changeCents}
                missingCents={missingCents}
              />
            </div>

            <div
              className="grid gap-2.5 bg-white px-4 py-[clamp(10px,1.4vh,14px)] sm:grid-cols-[minmax(0,0.76fr)_minmax(0,0.92fr)_minmax(0,1.32fr)] sm:px-5"
              style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
            >
              <ActionButton
                label="Cofnij"
                onClick={handleUndo}
                disabled={history.length === 0}
              />
              <ActionButton
                label="Wyczyść"
                onClick={handleClear}
                disabled={!hasSaleInProgress}
              />
              <ActionButton
                label="Zapłacone"
                onClick={handleSettle}
                disabled={!canSettle}
                primary
              />
            </div>
          </div>
        </aside>
      </div>

      <div
        className={`pointer-events-none fixed left-1/2 top-5 z-20 -translate-x-1/2 rounded-full bg-black px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-success shadow-[0_24px_80px_rgba(0,0,0,0.32)] transition-all ${
          settledToast
            ? "translate-y-0 opacity-100"
            : "-translate-y-4 opacity-0"
        }`}
      >
        {settledToast}
      </div>

      <div className="sr-only" aria-live="polite">
        {sales.length > 0
          ? `Zapisano ${sales.length} transakcji.`
          : "Brak zapisanych transakcji."}
      </div>
    </>
  );
}

function CatalogPane({
  categoryTabs,
  effectiveCategoryId,
  fullscreen = false,
  onAddProduct,
  onSelectCategory,
  onToggleFullscreen,
  orderItems,
  products,
}: {
  categoryTabs: { id: string; label: string }[];
  effectiveCategoryId: string;
  fullscreen?: boolean;
  onAddProduct: (productId: string, quantity?: number) => void;
  onSelectCategory: (categoryId: string) => void;
  onToggleFullscreen: () => void;
  orderItems: OrderItems;
  products: Product[];
}) {
  return (
    <section className="min-h-0 border-b border-border bg-surface-subtle lg:border-r lg:border-b-0">
      <div className="flex h-full min-h-0 flex-col">
        <CatalogToolbar
          categoryTabs={categoryTabs}
          effectiveCategoryId={effectiveCategoryId}
          fullscreen={fullscreen}
          onSelectCategory={onSelectCategory}
          onToggleFullscreen={onToggleFullscreen}
        />

        <CatalogGrid
          fullscreen={fullscreen}
          onAddProduct={onAddProduct}
          orderItems={orderItems}
          products={products}
        />
      </div>
    </section>
  );
}

function CatalogToolbar({
  categoryTabs,
  effectiveCategoryId,
  onSelectCategory,
  onToggleFullscreen,
  fullscreen = false,
}: {
  categoryTabs: { id: string; label: string }[];
  effectiveCategoryId: string;
  fullscreen?: boolean;
  onSelectCategory: (categoryId: string) => void;
  onToggleFullscreen: () => void;
}) {
  return categoryTabs.length === 0 ? (
    <div className={`${fullscreen ? "px-4 pb-1 pt-3" : "px-3 pb-1 pt-3 sm:px-4"}`}>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={fullscreen ? "Wyłącz pełny ekran" : "Włącz pełny ekran"}
          className="relative z-20 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-transparent text-slate-900 transition hover:bg-slate-100"
        >
          {fullscreen ? (
            <Minimize2 className="h-4.5 w-4.5" />
          ) : (
            <Maximize2 className="h-4.5 w-4.5" />
          )}
        </button>
      </div>
    </div>
  ) : (
    <div
      className={`shrink-0 border-b border-border bg-white ${
        fullscreen ? "px-4 py-2.5" : "px-3 py-2.5 sm:px-4"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          {categoryTabs.map((category) => {
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                className={`min-h-[46px] touch-manipulation whitespace-nowrap rounded-[16px] border px-5 py-2.5 text-[16px] font-bold tracking-[-0.03em] transition ${
                  category.id === effectiveCategoryId
                    ? "border-slate-950 bg-slate-950 text-white shadow-[0_10px_20px_rgba(15,23,42,0.1)]"
                    : "border-border bg-white text-slate-700"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={fullscreen ? "Wyłącz pełny ekran" : "Włącz pełny ekran"}
          className="relative z-20 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-transparent text-slate-900 transition hover:bg-slate-100"
        >
          {fullscreen ? (
            <Minimize2 className="h-4.5 w-4.5" />
          ) : (
            <Maximize2 className="h-4.5 w-4.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function CatalogGrid({
  onAddProduct,
  orderItems,
  products,
  fullscreen = false,
}: {
  fullscreen?: boolean;
  onAddProduct: (productId: string, quantity?: number) => void;
  orderItems: OrderItems;
  products: Product[];
}) {
  return (
    <div
      className={`min-h-0 flex-1 overflow-auto ${
        fullscreen
          ? "h-full px-4 py-4 sm:px-5 sm:py-5"
          : "px-3 py-3 sm:px-4 sm:py-4"
      }`}
      style={{
        paddingBottom: fullscreen
          ? "max(20px, env(safe-area-inset-bottom))"
          : "max(16px, env(safe-area-inset-bottom))",
      }}
    >
      <div
        className={`grid auto-rows-fr content-start ${
          fullscreen
            ? "grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            : "grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {products.map((product) => (
          <ProductTile
            key={product.id}
            product={product}
            quantity={orderItems[product.id] ?? 0}
            onAdd={() => onAddProduct(product.id)}
            onAddDouble={() => onAddProduct(product.id, 2)}
            fullscreen={fullscreen}
          />
        ))}
      </div>
    </div>
  );
}

function CashPresetButton({
  active,
  amount,
  animated,
  onClick,
}: {
  active: boolean;
  amount: number;
  animated: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[clamp(62px,7.8vh,74px)] touch-manipulation rounded-[18px] border px-3 py-3 text-center text-[18px] font-black tracking-[-0.04em] transition duration-150 active:scale-[0.98] sm:text-[20px] ${
        active
          ? "border-slate-950 bg-white text-slate-950 shadow-[0_12px_22px_rgba(15,23,42,0.08)]"
          : "border-border bg-white text-slate-900 hover:border-slate-500 hover:bg-slate-50"
      } focus-visible:border-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/12`}
      style={animated ? { animation: "cash-preset-pop 260ms ease-out" } : undefined}
    >
      {formatMoney(amount)}
    </button>
  );
}

function ProductTile({
  fullscreen = false,
  product,
  quantity,
  onAdd,
  onAddDouble,
}: {
  fullscreen?: boolean;
  onAdd: () => void;
  onAddDouble: () => void;
  product: Product;
  quantity: number;
}) {
  const clickTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  if (product.isSpacer) {
    return (
      <div
        aria-hidden="true"
        className={`rounded-[22px] ${
          fullscreen
            ? "min-h-[clamp(176px,21vh,252px)]"
            : "min-h-[clamp(156px,20vh,228px)]"
        }`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (clickTimeoutRef.current !== null) {
          window.clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
          onAddDouble();
          return;
        }

        clickTimeoutRef.current = window.setTimeout(() => {
          clickTimeoutRef.current = null;
          onAdd();
        }, 180);
      }}
      className={`relative flex touch-manipulation flex-col justify-end overflow-hidden rounded-[22px] border bg-white text-left shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition active:scale-[0.995] ${
        fullscreen
          ? "min-h-[clamp(176px,21vh,252px)] px-5 pb-5 pt-8"
          : "min-h-[clamp(156px,20vh,228px)] px-4 pb-4 pt-7"
      } ${
        quantity > 0
          ? "border-slate-300 shadow-[0_18px_38px_rgba(76,140,255,0.12)]"
          : "border-border"
      }`}
    >
      {product.imageDataUrl ? (
        <>
          <Image
            src={product.imageDataUrl}
            alt=""
            fill
            unoptimized
            sizes={
              fullscreen
                ? "(max-width: 768px) 50vw, (max-width: 1536px) 33vw, 20vw"
                : "(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            }
            className="object-cover"
            style={{
              objectPosition: `${product.imagePositionX}% ${product.imagePositionY}%`,
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.14)_44%,rgba(15,23,42,0.84)_100%)]" />
        </>
      ) : null}

      {product.imageDataUrl ? null : (
        <div
          className="absolute inset-x-0 top-0 h-4.5"
          style={{ backgroundColor: product.accentColor }}
        />
      )}

      {quantity > 0 ? (
        <div
          className={`absolute flex items-center justify-center rounded-full bg-black font-black text-white shadow-[0_12px_24px_rgba(0,0,0,0.12)] ${
            fullscreen
              ? "right-4 top-6 min-w-[40px] px-3 py-2 text-[16px]"
              : "right-3.5 top-5 min-w-[34px] px-2.5 py-1.5 text-[15px]"
          }`}
        >
          x{quantity}
        </div>
      ) : null}

      <div
        className={`relative z-[1] max-w-full ${fullscreen ? "space-y-3" : "space-y-2.5"} ${
          quantity > 0 ? "pr-11" : "pr-1"
        }`}
      >
        <p
          className={`max-w-full break-words font-black leading-[0.92] tracking-[-0.06em] ${
            product.imageDataUrl ? "text-white" : "text-slate-950"
          } ${
            fullscreen
              ? "text-[clamp(1.85rem,2.1vw,2.5rem)]"
              : "text-[clamp(1.45rem,1.6vw,2rem)]"
          }`}
        >
          {product.name}
        </p>
        <p
          className={`font-black leading-none tracking-[-0.08em] ${
            product.imageDataUrl ? "text-white" : "text-slate-950"
          } ${
            fullscreen
              ? "text-[clamp(2.3rem,2.6vw,3.15rem)]"
              : "text-[clamp(1.9rem,2vw,2.7rem)]"
          }`}
        >
          {formatMoneyWithCurrency(product.priceCents)}
        </p>
      </div>
    </button>
  );
}

function OrderRow({
  product,
  quantity,
  onDecrease,
}: {
  onDecrease: () => void;
  product: Product;
  quantity: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-slate-50/72 px-3 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-[18px] font-black tracking-[-0.04em] text-slate-950 sm:text-[19px]">
          {product.name}
        </p>
        <p className="mt-1 text-[16px] font-bold tracking-[-0.04em] text-slate-900">
          {formatMoneyWithCurrency(product.priceCents)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex min-w-[46px] items-center justify-center rounded-full bg-white px-3 py-2 text-[15px] font-black text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
          x{quantity}
        </div>
        <QuantityControl onClick={onDecrease}>−</QuantityControl>
      </div>
    </div>
  );
}

function QuantityControl({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-border bg-white text-[26px] font-medium leading-none text-slate-950 transition hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function ChangeCard({
  totalCents,
  tenderedCents,
  changeCents,
  missingCents,
}: {
  changeCents: null | number;
  missingCents: number;
  tenderedCents: null | number;
  totalCents: number;
}) {
  if (totalCents === 0) {
    return null;
  }

  if (tenderedCents === null) {
    return (
      <div className="rounded-[18px] border border-border-strong bg-white px-5 py-4 text-center shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
        <p className="text-[16px] font-black tracking-[-0.04em] text-slate-950 sm:text-[17px]">
          Wpisz kwotę
        </p>
      </div>
    );
  }

  if (changeCents !== null && changeCents < 0) {
    return (
      <div className="rounded-[24px] border border-amber-300 bg-amber-50 px-5 py-[clamp(18px,2.5vh,28px)] text-center shadow-[0_12px_24px_rgba(245,158,11,0.08)]">
        <p className="text-xs font-bold tracking-[0.2em] text-amber-700 sm:text-sm">
          Brakuje do zapłaty
        </p>
        <p className="mt-3 text-[clamp(2.8rem,5vh,3.4rem)] font-black leading-none tracking-[-0.08em] text-amber-950">
          {formatMoneyWithCurrency(missingCents)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] bg-black px-5 py-[clamp(16px,2.2vh,24px)] text-center shadow-[0_24px_54px_rgba(0,0,0,0.18)]">
      <p className="text-sm font-bold tracking-[0.2em] text-success sm:text-base">
        Wydaj resztę
      </p>
      <p className="mt-3 text-[clamp(3.8rem,7.5vh,5.2rem)] font-black leading-none tracking-[-0.1em] text-white">
        {formatMoneyWithCurrency(changeCents ?? 0)}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  primary = false,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[clamp(54px,6.4vh,62px)] touch-manipulation rounded-[18px] border px-4 py-3 text-center text-[15px] font-black tracking-[0.02em] transition sm:text-[16px] ${
        primary
          ? "border-black bg-black text-white shadow-[0_16px_28px_rgba(0,0,0,0.14)] enabled:hover:translate-y-[-1px]"
          : "border-border-strong bg-white text-slate-950"
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {label}
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

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatMoneyWithCurrency(cents: number) {
  return `${formatMoney(cents)} zł`;
}

function formatTenderedInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function parseCurrencyToCents(value: string) {
  if (!value || value === ".") {
    return null;
  }

  const parsedValue = Number.parseFloat(value);

  if (Number.isNaN(parsedValue)) {
    return null;
  }

  return Math.round(parsedValue * 100);
}

function normalizeCurrencyInput(rawValue: string) {
  const cleanedValue = rawValue.replace(",", ".").replace(/[^\d.]/g, "");

  if (!cleanedValue) {
    return "";
  }

  const [wholePart, ...decimalParts] = cleanedValue.split(".");
  const joinedDecimal = decimalParts.join("").slice(0, 2);

  if (cleanedValue.includes(".")) {
    return `${wholePart || "0"}${joinedDecimal ? `.${joinedDecimal}` : "."}`;
  }

  return wholePart;
}
