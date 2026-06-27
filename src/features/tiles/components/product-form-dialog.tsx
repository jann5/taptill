"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { accentPalette } from "@/features/sales/data/mock-catalog";
import { ImagePositionPicker } from "@/features/tiles/components/image-position-picker";
import type { Category, Product } from "@/features/sales/types";
import { readProductImageFile } from "@/features/tiles/lib/product-image";

type ProductFormDialogProps = {
  categories: Category[];
  initialProduct?: Product | null;
  onClose: () => void;
  onSubmit: (input: {
    accentColor: string;
    categoryId: null | string;
    imageDataUrl: null | string;
    imagePositionX: number;
    imagePositionY: number;
    isSpacer?: boolean;
    name: string;
    priceCents: number;
  }) => void;
  title: string;
};

export function ProductFormDialog({
  categories,
  initialProduct,
  onClose,
  onSubmit,
  title,
}: ProductFormDialogProps) {
  const [mode, setMode] = useState<"product" | "spacer">(
    initialProduct?.isSpacer ? "spacer" : "product",
  );
  const [name, setName] = useState(initialProduct?.name ?? "");
  const [price, setPrice] = useState(
    initialProduct ? formatPriceInput(initialProduct.priceCents) : "",
  );
  const [categoryId, setCategoryId] = useState<string>(initialProduct?.categoryId ?? "");
  const [accentColor, setAccentColor] = useState<string>(
    initialProduct?.accentColor ?? accentPalette[0],
  );
  const [imageDataUrl, setImageDataUrl] = useState<null | string>(
    initialProduct?.imageDataUrl ?? null,
  );
  const [imagePositionX, setImagePositionX] = useState(
    initialProduct?.imagePositionX ?? 50,
  );
  const [imagePositionY, setImagePositionY] = useState(
    initialProduct?.imagePositionY ?? 50,
  );
  const [imageError, setImageError] = useState("");
  const [positioningMode, setPositioningMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const priceCents = parsePriceToCents(price);
  const canSubmit =
    mode === "spacer" || (name.trim().length > 0 && priceCents !== null);

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const nextImageDataUrl = await readProductImageFile(file);

      setImageDataUrl(nextImageDataUrl);
      setImagePositionX(50);
      setImagePositionY(50);
      setPositioningMode(false);
      setImageError("");
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "Nie udało się dodać zdjęcia",
      );
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4">
      <div className="w-full max-w-[560px] rounded-[34px] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-7">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h3 className="text-[28px] font-black tracking-[-0.06em] text-slate-950">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full bg-slate-100 px-3 text-[22px] font-bold text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="py-5">
          <div className="mb-5 flex gap-2">
            <ModeButton
              active={mode === "product"}
              label="Kafelek"
              onClick={() => setMode("product")}
            />
            <ModeButton
              active={mode === "spacer"}
              label="Pusty slot"
              onClick={() => setMode("spacer")}
            />
          </div>

          <div className="space-y-5">
            {mode === "product" ? (
              <>
                <DialogField label="Zdjęcie">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {imageDataUrl ? (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-[22px] bg-slate-50">
                        <ImagePositionPicker
                          active={positioningMode}
                          imageDataUrl={imageDataUrl}
                          positionX={imagePositionX}
                          positionY={imagePositionY}
                          sizes="(max-width: 640px) 100vw, 520px"
                          onChange={(x, y) => {
                            setImagePositionX(x);
                            setImagePositionY(y);
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPositioningMode((current) => !current);
                          }}
                          className={`min-h-[40px] rounded-full px-3.5 text-[13px] font-bold transition ${
                            positioningMode
                              ? "bg-slate-950 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {positioningMode ? "Gotowe" : "Ustaw środek"}
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="min-h-[40px] rounded-full bg-slate-100 px-3.5 text-[13px] font-bold text-slate-700 transition hover:bg-slate-200"
                        >
                          Zmień zdjęcie
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImageDataUrl(null);
                            setImagePositionX(50);
                            setImagePositionY(50);
                            setPositioningMode(false);
                            setImageError("");
                          }}
                          className="min-h-[40px] rounded-full bg-[#fff1f1] px-3.5 text-[13px] font-bold text-[#c73838] transition hover:bg-[#ffe3e3]"
                        >
                          Usuń zdjęcie
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-[120px] w-full items-center justify-center rounded-[22px] border-2 border-dashed border-slate-300 bg-slate-50 text-[15px] font-bold text-slate-500"
                    >
                      Dodaj zdjęcie
                    </button>
                  )}
                  {imageError ? (
                    <p className="mt-2 text-sm font-bold text-[#b91c1c]">
                      {imageError}
                    </p>
                  ) : null}
                </DialogField>

                <DialogField label="Nazwa">
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Np. Kawa"
                    className="h-[58px] w-full rounded-[18px] border border-slate-200 bg-white px-4 text-[19px] font-black tracking-[-0.04em] text-slate-950 outline-none"
                  />
                </DialogField>

                <DialogField label="Cena">
                  <div className="flex items-center rounded-[18px] border border-slate-200 bg-white px-4">
                    <input
                      value={price}
                      onChange={(event) =>
                        setPrice(normalizePriceInput(event.target.value))
                      }
                      inputMode="decimal"
                      placeholder="0.00"
                      className="h-[58px] w-full border-none bg-transparent text-[19px] font-black tracking-[-0.04em] text-slate-950 outline-none"
                    />
                    <span className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
                      zł
                    </span>
                  </div>
                </DialogField>
              </>
            ) : null}

            <DialogField label="Kategoria">
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-[58px] w-full rounded-[18px] border border-slate-200 bg-white px-4 text-[18px] font-bold text-slate-950 outline-none"
              >
                <option value="">Bez kategorii</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </DialogField>

            {mode === "product" ? (
              <DialogField label="Kolor">
                <div className="flex flex-wrap gap-3">
                  {accentPalette.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setAccentColor(swatch)}
                      className={`h-12 w-12 rounded-full ${
                        swatch === accentColor
                          ? "ring-2 ring-slate-950 ring-offset-4 ring-offset-white"
                          : ""
                      }`}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
              </DialogField>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[60px] rounded-full border border-slate-200 bg-white px-5 text-[15px] font-bold text-slate-700"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canSubmit || (mode === "product" && priceCents === null)) {
                return;
              }

              onSubmit({
                accentColor: mode === "spacer" ? "#dbe7f7" : accentColor,
                categoryId: categoryId || null,
                imageDataUrl: mode === "spacer" ? null : imageDataUrl,
                imagePositionX: mode === "spacer" ? 50 : imagePositionX,
                imagePositionY: mode === "spacer" ? 50 : imagePositionY,
                isSpacer: mode === "spacer",
                name: mode === "spacer" ? "" : name.trim(),
                priceCents: mode === "spacer" ? 0 : (priceCents ?? 0),
              });
              onClose();
            }}
            disabled={!canSubmit}
            className="min-h-[60px] rounded-full bg-black px-5 text-[15px] font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] disabled:opacity-40"
          >
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[44px] rounded-full px-4 text-[14px] font-black transition ${
        active
          ? "bg-black text-white"
          : "border border-slate-200 bg-white text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function DialogField({
  label,
  children,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function normalizePriceInput(value: string) {
  const cleanedValue = value.replace(",", ".").replace(/[^\d.]/g, "");

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

function parsePriceToCents(value: string) {
  if (!value || value === ".") {
    return null;
  }

  const parsedValue = Number.parseFloat(value.replace(",", "."));

  if (Number.isNaN(parsedValue)) {
    return null;
  }

  return Math.max(0, Math.round(parsedValue * 100));
}

function formatPriceInput(cents: number) {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}
