"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { ProductFormDialog } from "@/features/tiles/components/product-form-dialog";
import { readProductImageFile } from "@/features/tiles/lib/product-image";
import { useTaptillStore } from "@/features/workspace/state/taptill-store";
import type { Product } from "@/features/sales/types";

type ProductDraft = {
  accentColor: string;
  categoryId: string;
  imageDataUrl: null | string;
  imagePositionX: number;
  imagePositionY: number;
  name: string;
  price: string;
  productId: string;
};

export function TileManagementScreen() {
  const {
    addProduct,
    addCategory,
    categories,
    deleteProduct,
    moveProductToPosition,
    products,
    updateProduct,
  } = useTaptillStore();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [draggedProductId, setDraggedProductId] = useState("");
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 140,
        tolerance: 8,
      },
    }),
  );

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? products[0] ?? null;
  const activeDraft =
    selectedProduct === null
      ? null
      : draft?.productId === selectedProduct.id
        ? draft
        : mapProductToDraft(selectedProduct);

  const categoryTabs = useMemo(() => categories, [categories]);

  const visibleProducts = activeCategoryId
    ? products.filter((product) => product.categoryId === activeCategoryId)
    : products;
  const selectedProductIsSpacer = Boolean(selectedProduct?.isSpacer);
  const draggedProduct =
    visibleProducts.find((product) => product.id === draggedProductId) ?? null;

  const canSaveDraft =
    !!selectedProduct &&
    !!activeDraft &&
    (selectedProduct.isSpacer ||
      (activeDraft.name.trim().length > 0 &&
        parsePriceToCents(activeDraft.price) !== null));

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedProductId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedProductId("");

    if (!event.over) {
      return;
    }

    const sourceProductId = String(event.active.id);
    const targetProductId = String(event.over.id);

    if (sourceProductId === targetProductId) {
      return;
    }

    moveProductToPosition(sourceProductId, targetProductId);
    setSelectedProductId(sourceProductId);
  };

  const handleDraftImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file || !selectedProduct) {
      return;
    }

    try {
      const imageDataUrl = await readProductImageFile(file);

      setDraft((current) => ({
        ...(current?.productId === selectedProduct.id
          ? current
          : mapProductToDraft(selectedProduct)),
        imageDataUrl,
      }));
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
    <>
      <div className="h-full overflow-auto bg-surface-subtle px-4 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto flex min-h-full max-w-[1620px] flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
              <h2 className="text-[28px] font-black tracking-[-0.07em] text-slate-950 sm:text-[34px]">
                Kafelki
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  const label = window.prompt("Nazwa kategorii");

                  if (!label) {
                    return;
                  }

                  const category = addCategory(label);

                  if (category) {
                    setActiveCategoryId(category.id);
                  }
                }}
                className="min-h-[52px] rounded-full border border-border bg-white px-5 text-[15px] font-bold text-slate-700"
              >
                Nowa kategoria
              </button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="flex min-h-0 flex-col gap-4 rounded-[32px] bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.05)] sm:p-5">
              {categoryTabs.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {categoryTabs.map((category) => {
                    const isActive = activeCategoryId === category.id;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() =>
                          setActiveCategoryId((currentCategoryId) =>
                            currentCategoryId === category.id ? "" : category.id,
                          )
                        }
                        className={`min-h-[48px] rounded-full px-4 text-[15px] font-black tracking-[-0.04em] transition ${
                          isActive
                            ? "bg-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)]"
                            : "border border-border bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950"
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="min-h-0 flex-1">
                <DndContext
                  collisionDetection={closestCenter}
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={visibleProducts.map((product) => product.id)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                      {visibleProducts.map((product) => (
                        <SortableTileCard
                          key={product.id}
                          product={product}
                          selected={selectedProduct?.id === product.id}
                          onSelect={() => setSelectedProductId(product.id)}
                        />
                      ))}

                      <button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="flex min-h-[clamp(156px,20vh,228px)] items-center justify-center rounded-[22px] border-2 border-dashed border-slate-300 bg-[#f8fbff] text-slate-400 transition hover:border-slate-400 hover:text-slate-600"
                      >
                        <Plus className="h-12 w-12 stroke-[1.4]" />
                      </button>
                    </div>
                  </SortableContext>

                  <DragOverlay>
                    {draggedProduct ? (
                      <TileCardContent
                        product={draggedProduct}
                        selected={false}
                        dragging
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </section>

            <aside className="rounded-[32px] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)] sm:px-6">
              {selectedProduct && activeDraft ? (
                <>
                  <div className="border-b border-slate-200 pb-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      Edycja
                    </p>
                    <h3 className="mt-2 text-[32px] font-black tracking-[-0.07em] text-slate-950">
                      {selectedProduct.isSpacer ? "Pusty slot" : selectedProduct.name}
                    </h3>
                  </div>

                  <div className="space-y-5 py-5">
                    {selectedProduct.isSpacer ? null : (
                      <>
                        <EditorInputField
                          label="Nazwa"
                          value={activeDraft.name}
                          onChange={(value) =>
                            setDraft((current) => ({
                              ...(current?.productId === selectedProduct.id
                                ? current
                                : mapProductToDraft(selectedProduct)),
                              name: value,
                            }))
                          }
                        />
                        <EditorInputField
                          label="Cena"
                          value={activeDraft.price}
                          suffix="zł"
                          onChange={(value) =>
                            setDraft((current) => ({
                              ...(current?.productId === selectedProduct.id
                                ? current
                                : mapProductToDraft(selectedProduct)),
                              price: normalizePriceInput(value),
                            }))
                          }
                        />
                      </>
                    )}
                    <EditorSelectField
                      label="Kategoria"
                      value={activeDraft.categoryId}
                      options={categories.map((category) => ({
                        label: category.label,
                        value: category.id,
                      }))}
                      onChange={(value) =>
                        setDraft((current) => ({
                          ...(current?.productId === selectedProduct.id
                            ? current
                            : mapProductToDraft(selectedProduct)),
                          categoryId: value,
                        }))
                      }
                    />
                  </div>

                  {selectedProduct.isSpacer ? null : (
                    <div className="border-t border-slate-200 py-5">
                      <div className="border-b border-slate-200 pb-5">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Zdjęcie
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDraftImageChange}
                          className="hidden"
                        />
                        {activeDraft.imageDataUrl ? (
                          <div className="mt-3 space-y-3">
                            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                              <div className="relative h-[188px] w-full">
                                <Image
                                  src={activeDraft.imageDataUrl}
                                  alt=""
                                  fill
                                  unoptimized
                                  sizes="320px"
                                  className="object-cover"
                                  style={{
                                    objectPosition: formatImagePosition(
                                      activeDraft.imagePositionX,
                                      activeDraft.imagePositionY,
                                    ),
                                  }}
                                />
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                              <button
                                type="button"
                                onClick={() => {
                                  setDraft((current) => ({
                                    ...(current?.productId === selectedProduct.id
                                      ? current
                                      : mapProductToDraft(selectedProduct)),
                                    imagePositionX: 50,
                                    imagePositionY: 50,
                                  }));
                                }}
                                className="min-h-[52px] rounded-[18px] border border-border bg-white px-4 text-[15px] font-bold text-slate-700"
                              >
                                Wyśrodkuj zdjęcie
                              </button>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="min-h-[52px] rounded-[18px] border border-border bg-white px-4 text-[15px] font-bold text-slate-700"
                              >
                                Zmień zdjęcie
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDraft((current) => ({
                                    ...(current?.productId === selectedProduct.id
                                      ? current
                                      : mapProductToDraft(selectedProduct)),
                                    imageDataUrl: null,
                                  }));
                                  setImageError("");
                                }}
                                className="min-h-[52px] rounded-[18px] border border-[#fecaca] bg-[#fff5f5] px-4 text-[15px] font-bold text-[#b91c1c]"
                              >
                                Usuń zdjęcie
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-3 flex h-[120px] w-full items-center justify-center rounded-[22px] border-2 border-dashed border-slate-300 bg-slate-50 text-[15px] font-bold text-slate-500"
                          >
                            Dodaj zdjęcie
                          </button>
                        )}
                        {imageError ? (
                          <p className="mt-2 text-sm font-bold text-[#b91c1c]">
                            {imageError}
                          </p>
                        ) : null}
                      </div>

                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        Kolor
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {[
                          "#4c8cff",
                          "#4cd87e",
                          "#ffc72b",
                          "#aa52f2",
                          "#ff708b",
                          "#0f172a",
                        ].map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            onClick={() =>
                              setDraft((current) => ({
                                ...(current?.productId === selectedProduct.id
                                  ? current
                                  : mapProductToDraft(selectedProduct)),
                                accentColor: swatch,
                              }))
                            }
                            className={`h-12 w-12 rounded-full transition ${
                              swatch === activeDraft.accentColor
                                ? "ring-2 ring-slate-950 ring-offset-4 ring-offset-white"
                                : ""
                            }`}
                            style={{ backgroundColor: swatch }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !window.confirm(
                            selectedProduct.isSpacer
                              ? "Usunąć pusty slot?"
                              : `Usunąć ${selectedProduct.name}?`,
                          )
                        ) {
                          return;
                        }

                        deleteProduct(selectedProduct.id);
                      }}
                      className="min-h-[56px] rounded-full border border-[#fecaca] bg-[#fff5f5] px-5 text-[15px] font-bold text-[#b91c1c]"
                    >
                      Usuń
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const priceCents = parsePriceToCents(activeDraft.price);

                        if (
                          !selectedProductIsSpacer &&
                          (!canSaveDraft || priceCents === null)
                        ) {
                          return;
                        }

                        updateProduct(selectedProduct.id, {
                          accentColor: activeDraft.accentColor,
                          categoryId: activeDraft.categoryId || null,
                          imageDataUrl: activeDraft.imageDataUrl,
                          imagePositionX: activeDraft.imagePositionX,
                          imagePositionY: activeDraft.imagePositionY,
                          isSpacer: selectedProduct.isSpacer,
                          name: selectedProduct.isSpacer ? "" : activeDraft.name.trim(),
                          priceCents: selectedProduct.isSpacer ? 0 : (priceCents ?? 0),
                        });
                      }}
                      disabled={!canSaveDraft}
                      className="min-h-[64px] rounded-full bg-black px-5 text-[16px] font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] disabled:opacity-40"
                    >
                      Zapisz
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-6 text-center">
                  <p className="text-[20px] font-black tracking-[-0.04em] text-slate-950">
                    Dodaj pierwszy kafelek
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

      {dialogOpen ? (
        <ProductFormDialog
          title="Nowy kafelek"
          categories={categories}
          onClose={() => setDialogOpen(false)}
          onSubmit={(input) => {
            const createdProduct = addProduct(input);

            setSelectedProductId(createdProduct.id);
            setDraft(mapProductToDraft(createdProduct));

            if (input.categoryId) {
              setActiveCategoryId(input.categoryId);
            }
          }}
        />
      ) : null}
    </>
  );
}

function SortableTileCard({
  product,
  selected,
  onSelect,
}: {
  onSelect: () => void;
  product: Product;
  selected: boolean;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: product.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        touchAction: "none",
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={isDragging ? "z-10 opacity-70" : ""}
      {...attributes}
      {...listeners}
    >
      <TileCardContent
        product={product}
        selected={selected}
        onClick={onSelect}
        dragging={isDragging}
      />
    </div>
  );
}

function TileCardContent({
  product,
  selected,
  onClick,
  dragging = false,
}: {
  dragging?: boolean;
  onClick?: () => void;
  product: Product;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ touchAction: "none" }}
      className={`relative min-h-[clamp(156px,20vh,228px)] w-full overflow-hidden rounded-[22px] border bg-white text-left transition ${
        product.isSpacer ? "border-dashed" : ""
      } ${
        selected
          ? "border-slate-950 shadow-[0_18px_40px_rgba(76,140,255,0.14)]"
          : "border-border shadow-[0_10px_26px_rgba(15,23,42,0.04)]"
      } ${dragging ? "cursor-grabbing" : "cursor-grab"} select-none`}
    >
      {product.isSpacer ? (
        <div className="flex h-full items-center justify-center px-5 py-5 text-center">
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
            Pusty slot
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-end px-4 pb-4 pt-7">
          {product.imageDataUrl ? (
            <>
              <Image
                src={product.imageDataUrl}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                className="object-cover"
                style={{
                  objectPosition: formatImagePosition(
                    product.imagePositionX,
                    product.imagePositionY,
                  ),
                }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.18)_46%,rgba(15,23,42,0.86)_100%)]" />
            </>
          ) : null}
          {product.imageDataUrl ? null : (
            <span
              className="absolute inset-x-0 top-0 h-4.5"
              style={{ backgroundColor: product.accentColor }}
            />
          )}
          <div className="relative space-y-2">
            <p
              className={`text-[clamp(1.45rem,1.6vw,2rem)] font-black leading-[0.92] tracking-[-0.06em] ${
                product.imageDataUrl ? "text-white" : "text-slate-950"
              }`}
            >
              {product.name}
            </p>
            <p
              className={`text-[clamp(1.9rem,2vw,2.7rem)] font-black leading-none tracking-[-0.08em] ${
                product.imageDataUrl ? "text-white" : "text-slate-950"
              }`}
            >
              {formatMoney(product.priceCents)} zł
            </p>
          </div>
        </div>
      )}
    </button>
  );
}

function EditorInputField({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  onChange: (value: string) => void;
  suffix?: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 flex items-end gap-4">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border-none bg-transparent p-0 text-[24px] font-black tracking-[-0.05em] text-slate-950 outline-none"
        />
        {suffix ? (
          <span className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EditorSelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border-none bg-transparent p-0 text-[24px] font-black tracking-[-0.05em] text-slate-950 outline-none"
      >
        <option value="">Bez kategorii</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function mapProductToDraft(product: Product): ProductDraft {
  return {
    accentColor: product.accentColor,
    categoryId: product.categoryId ?? "",
    imageDataUrl: product.imageDataUrl ?? null,
    imagePositionX: product.imagePositionX,
    imagePositionY: product.imagePositionY,
    name: product.name,
    price: formatMoney(product.priceCents),
    productId: product.id,
  };
}

function formatImagePosition(x: number, y: number) {
  return `${x}% ${y}%`;
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
