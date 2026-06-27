"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultSettings,
  initialCategories,
  initialProducts,
} from "@/features/sales/data/mock-catalog";
import type {
  AccountRecord,
  AppSettings,
  AuthState,
  Category,
  Product,
  SaleItemRecord,
  SaleRecord,
  TaptillStoredState,
} from "@/features/sales/types";

const STORAGE_KEY = "taptill-state-v1";
const LEGACY_CASH_PRESETS = [1000, 2000, 5000, 10000, 20000];

const initialState: TaptillStoredState = {
  categories: initialCategories,
  products: initialProducts,
  sales: [],
  auth: {
    currentUserId: null,
    users: [],
  },
  settings: defaultSettings,
};

type CreateProductInput = {
  accentColor: string;
  categoryId: null | string;
  imageDataUrl: null | string;
  imagePositionX: number;
  imagePositionY: number;
  isSpacer?: boolean;
  name: string;
  priceCents: number;
};

type UpdateProductInput = CreateProductInput;

type CreateSaleInput = {
  changeCents: number;
  createdAtIso: string;
  createdAtLabel: string;
  items: SaleItemRecord[];
  tenderedCents: number;
  totalCents: number;
};

type LoginAccountInput = {
  email: string;
  password: string;
};

type RegisterAccountInput = {
  displayName: string;
  email: string;
  password: string;
};

type AccountActionResult = {
  message: string;
  ok: boolean;
};

type TaptillStoreValue = {
  account: {
    currentUser: null | Omit<AccountRecord, "passwordHash">;
    userCount: number;
  };
  categories: Category[];
  categoryTabs: Category[];
  products: Product[];
  sales: SaleRecord[];
  settings: AppSettings;
  addCategory: (label: string) => Category | null;
  addSpacer: (categoryId?: null | string) => Product;
  addProduct: (input: CreateProductInput) => Product;
  addSale: (input: CreateSaleInput) => SaleRecord;
  clearSales: () => void;
  deleteProduct: (productId: string) => void;
  duplicateProduct: (productId: string) => Product | null;
  hydrated: boolean;
  loginAccount: (input: LoginAccountInput) => Promise<AccountActionResult>;
  logoutAccount: () => void;
  moveProductToPosition: (sourceProductId: string, targetProductId: string) => void;
  replaceCashPreset: (index: number, amountCents: number) => void;
  registerAccount: (input: RegisterAccountInput) => Promise<AccountActionResult>;
  swapProductPositions: (sourceProductId: string, targetProductId: string) => void;
  updateProduct: (productId: string, input: UpdateProductInput) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
};

const TaptillStoreContext = createContext<TaptillStoreValue | null>(null);

export function TaptillProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TaptillStoredState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      try {
        const savedState = window.localStorage.getItem(STORAGE_KEY);

        if (savedState) {
          setState(normalizeState(JSON.parse(savedState)));
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore local quota errors so the UI keeps working even with image tiles.
    }
  }, [hydrated, state]);

  const categoryTabs = useMemo(
    () => [{ id: "all", label: "Wszystko" }, ...state.categories],
    [state.categories],
  );
  const currentUser = useMemo(() => {
    const matchedUser = state.auth.users.find(
      (user) => user.id === state.auth.currentUserId,
    );

    if (!matchedUser) {
      return null;
    }

    return {
      createdAtIso: matchedUser.createdAtIso,
      displayName: matchedUser.displayName,
      email: matchedUser.email,
      id: matchedUser.id,
    };
  }, [state.auth.currentUserId, state.auth.users]);

  const value = useMemo<TaptillStoreValue>(
    () => ({
      account: {
        currentUser,
        userCount: state.auth.users.length,
      },
      categories: state.categories,
      categoryTabs,
      products: state.products,
      sales: state.sales,
      settings: state.settings,
      hydrated,
      addCategory: (label) => {
        const trimmedLabel = label.trim();

        if (!trimmedLabel) {
          return null;
        }

        const existingCategory = state.categories.find(
          (category) => category.label.toLowerCase() === trimmedLabel.toLowerCase(),
        );

        if (existingCategory) {
          return existingCategory;
        }

        const nextCategory = {
          id: createId("cat"),
          label: trimmedLabel,
        };

        setState((current) => ({
          ...current,
          categories: [...current.categories, nextCategory],
        }));

        return nextCategory;
      },
      addSpacer: (categoryId = null) => {
        const nextSpacer = {
          accentColor: "#dbe7f7",
          categoryId,
          id: createId("tile"),
          imageDataUrl: null,
          imagePositionX: 50,
          imagePositionY: 50,
          isSpacer: true,
          name: "",
          priceCents: 0,
          sortOrder: getNextSortOrder(state.products),
        };

        setState((current) => ({
          ...current,
          products: sortProducts([...current.products, nextSpacer]),
        }));

        return nextSpacer;
      },
      addProduct: (input) => {
        const nextProduct = {
          id: createId("tile"),
          isSpacer: input.isSpacer ?? false,
          ...input,
          sortOrder: getNextSortOrder(state.products),
        };

        setState((current) => ({
          ...current,
          products: sortProducts([...current.products, nextProduct]),
        }));

        return nextProduct;
      },
      addSale: (input) => {
        const nextSale = {
          id: createId("sale"),
          ...input,
        };

        setState((current) => ({
          ...current,
          sales: [nextSale, ...current.sales],
        }));

        return nextSale;
      },
      clearSales: () => {
        setState((current) => ({
          ...current,
          sales: [],
        }));
      },
      deleteProduct: (productId) => {
        setState((current) => ({
          ...current,
          products: current.products.filter((product) => product.id !== productId),
        }));
      },
      duplicateProduct: (productId) => {
        const sourceProduct = state.products.find((product) => product.id === productId);

        if (!sourceProduct) {
          return null;
        }

        const duplicatedProduct = {
          ...sourceProduct,
          id: createId("tile"),
          name: sourceProduct.isSpacer
            ? ""
            : `${sourceProduct.name} kopia`,
          sortOrder: getNextSortOrder(state.products),
        };

        setState((current) => ({
          ...current,
          products: sortProducts([...current.products, duplicatedProduct]),
        }));

        return duplicatedProduct;
      },
      loginAccount: async ({ email, password }) => {
        const normalizedEmail = normalizeEmail(email);
        const trimmedPassword = password.trim();

        if (!normalizedEmail || !trimmedPassword) {
          return { ok: false, message: "Wpisz e-mail i hasło" };
        }

        const matchedUser = state.auth.users.find(
          (user) => user.email === normalizedEmail,
        );

        if (!matchedUser) {
          return { ok: false, message: "Nie ma takiego konta" };
        }

        const passwordHash = await hashAccountPassword(
          normalizedEmail,
          trimmedPassword,
        );

        if (matchedUser.passwordHash !== passwordHash) {
          return { ok: false, message: "Nieprawidłowe hasło" };
        }

        setState((current) => ({
          ...current,
          auth: {
            ...current.auth,
            currentUserId: matchedUser.id,
          },
        }));

        return { ok: true, message: "Zalogowano" };
      },
      logoutAccount: () => {
        setState((current) => ({
          ...current,
          auth: {
            ...current.auth,
            currentUserId: null,
          },
        }));
      },
      moveProductToPosition: (sourceProductId, targetProductId) => {
        if (sourceProductId === targetProductId) {
          return;
        }

        setState((current) => ({
          ...current,
          products: moveProductBetween(
            current.products,
            sourceProductId,
            targetProductId,
          ),
        }));
      },
      replaceCashPreset: (index, amountCents) => {
        if (!Number.isFinite(amountCents) || amountCents <= 0) {
          return;
        }

        setState((current) => ({
          ...current,
          settings: {
            ...current.settings,
            cashPresets: current.settings.cashPresets.map((preset, presetIndex) =>
              presetIndex === index ? amountCents : preset,
            ),
          },
        }));
      },
      registerAccount: async ({ displayName, email, password }) => {
        const normalizedEmail = normalizeEmail(email);
        const trimmedDisplayName = displayName.trim();
        const trimmedPassword = password.trim();

        if (!trimmedDisplayName) {
          return { ok: false, message: "Wpisz nazwę konta" };
        }

        if (!normalizedEmail) {
          return { ok: false, message: "Wpisz poprawny e-mail" };
        }

        if (trimmedPassword.length < 6) {
          return { ok: false, message: "Hasło musi mieć min. 6 znaków" };
        }

        const existingUser = state.auth.users.find(
          (user) => user.email === normalizedEmail,
        );

        if (existingUser) {
          return { ok: false, message: "To konto już istnieje" };
        }

        const nextUser: AccountRecord = {
          createdAtIso: new Date().toISOString(),
          displayName: trimmedDisplayName,
          email: normalizedEmail,
          id: createId("account"),
          passwordHash: await hashAccountPassword(
            normalizedEmail,
            trimmedPassword,
          ),
        };

        setState((current) => ({
          ...current,
          auth: {
            currentUserId: nextUser.id,
            users: [...current.auth.users, nextUser],
          },
        }));

        return { ok: true, message: "Konto utworzone" };
      },
      swapProductPositions: (sourceProductId, targetProductId) => {
        if (sourceProductId === targetProductId) {
          return;
        }

        setState((current) => {
          const sourceProduct = current.products.find(
            (product) => product.id === sourceProductId,
          );
          const targetProduct = current.products.find(
            (product) => product.id === targetProductId,
          );

          if (!sourceProduct || !targetProduct) {
            return current;
          }

          return {
            ...current,
            products: sortProducts(
              current.products.map((product) => {
                if (product.id === sourceProductId) {
                  return { ...product, sortOrder: targetProduct.sortOrder };
                }

                if (product.id === targetProductId) {
                  return { ...product, sortOrder: sourceProduct.sortOrder };
                }

                return product;
              }),
            ),
          };
        });
      },
      updateProduct: (productId, input) => {
        setState((current) => ({
          ...current,
          products: sortProducts(
            current.products.map((product) =>
              product.id === productId ? { ...product, ...input } : product,
            ),
          ),
        }));
      },
      updateSettings: (patch) => {
        setState((current) => ({
          ...current,
          settings: {
            ...current.settings,
            ...patch,
          },
        }));
      },
    }),
    [categoryTabs, currentUser, hydrated, state],
  );

  return (
    <TaptillStoreContext.Provider value={value}>
      {children}
    </TaptillStoreContext.Provider>
  );
}

export function useTaptillStore() {
  const context = useContext(TaptillStoreContext);

  if (!context) {
    throw new Error("useTaptillStore must be used within TaptillProvider");
  }

  return context;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeState(value: unknown): TaptillStoredState {
  if (!value || typeof value !== "object") {
    return initialState;
  }

  const maybeState = value as Partial<TaptillStoredState>;

  return {
    categories: Array.isArray(maybeState.categories)
      ? maybeState.categories
          .filter(isCategory)
          .map((category) => ({
            id: category.id,
            label: category.label.trim(),
          }))
      : initialState.categories,
    products: Array.isArray(maybeState.products)
      ? sortProducts(
          maybeState.products.filter(isProduct).map((product) => ({
            ...product,
            categoryId: product.categoryId ?? null,
            imageDataUrl:
              typeof product.imageDataUrl === "string" ? product.imageDataUrl : null,
            imagePositionX:
              typeof product.imagePositionX === "number" &&
              Number.isFinite(product.imagePositionX)
                ? clampImagePosition(product.imagePositionX)
                : 50,
            imagePositionY:
              typeof product.imagePositionY === "number" &&
              Number.isFinite(product.imagePositionY)
                ? clampImagePosition(product.imagePositionY)
                : 50,
            isSpacer: Boolean(product.isSpacer),
            priceCents: Math.max(0, Math.round(product.priceCents)),
            sortOrder:
              typeof product.sortOrder === "number" &&
              Number.isFinite(product.sortOrder)
                ? product.sortOrder
                : 0,
          })),
        )
      : initialState.products,
    sales: Array.isArray(maybeState.sales)
      ? maybeState.sales.filter(isSaleRecord).map((sale) => ({
          ...sale,
          items: sale.items.filter(isSaleItemRecord),
        }))
      : initialState.sales,
    auth: isAuthState(maybeState.auth)
      ? {
          currentUserId: maybeState.auth.currentUserId,
          users: maybeState.auth.users.filter(isAccountRecord).map((user) => ({
            createdAtIso: user.createdAtIso,
            displayName: user.displayName.trim(),
            email: normalizeEmail(user.email),
            id: user.id,
            passwordHash: user.passwordHash,
          })),
        }
      : initialState.auth,
    settings: isSettings(maybeState.settings)
      ? {
          ...maybeState.settings,
          cashPresets: normalizeCashPresets(maybeState.settings.cashPresets),
        }
      : initialState.settings,
  };
}

function normalizeCashPresets(values: number[]) {
  const normalizedPresets = values
    .filter((valueItem) => Number.isFinite(valueItem) && valueItem > 0)
    .map((valueItem) => Math.round(valueItem));

  if (
    normalizedPresets.length === LEGACY_CASH_PRESETS.length &&
    normalizedPresets.every((valueItem, index) => valueItem === LEGACY_CASH_PRESETS[index])
  ) {
    return defaultSettings.cashPresets;
  }

  return normalizedPresets.length > 0
    ? normalizedPresets
    : defaultSettings.cashPresets;
}

function isCategory(value: unknown): value is Category {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Category).id === "string" &&
    typeof (value as Category).label === "string"
  );
}

function isProduct(value: unknown): value is Product {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Product).id === "string" &&
    typeof (value as Product).name === "string" &&
    typeof (value as Product).priceCents === "number" &&
    (typeof (value as Product).categoryId === "string" ||
      (value as Product).categoryId === null ||
      typeof (value as { categoryId?: undefined }).categoryId === "undefined") &&
    typeof (value as Product).accentColor === "string" &&
    (typeof (value as { imageDataUrl?: null | string }).imageDataUrl === "string" ||
      (value as { imageDataUrl?: null }).imageDataUrl === null ||
      typeof (value as { imageDataUrl?: undefined }).imageDataUrl === "undefined") &&
    (typeof (value as { imagePositionX?: number }).imagePositionX === "number" ||
      typeof (value as { imagePositionX?: undefined }).imagePositionX === "undefined") &&
    (typeof (value as { imagePositionY?: number }).imagePositionY === "number" ||
      typeof (value as { imagePositionY?: undefined }).imagePositionY === "undefined") &&
    (typeof (value as { isSpacer?: boolean }).isSpacer === "boolean" ||
      typeof (value as { isSpacer?: undefined }).isSpacer === "undefined") &&
    (typeof (value as { sortOrder?: number }).sortOrder === "number" ||
      typeof (value as { sortOrder?: undefined }).sortOrder === "undefined")
  );
}

function clampImagePosition(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function isSaleItemRecord(value: unknown): value is SaleItemRecord {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as SaleItemRecord).productId === "string" &&
    typeof (value as SaleItemRecord).productName === "string" &&
    typeof (value as SaleItemRecord).quantity === "number" &&
    typeof (value as SaleItemRecord).unitPriceCents === "number"
  );
}

function isSaleRecord(value: unknown): value is SaleRecord {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as SaleRecord).id === "string" &&
    typeof (value as SaleRecord).createdAtIso === "string" &&
    typeof (value as SaleRecord).createdAtLabel === "string" &&
    Array.isArray((value as SaleRecord).items) &&
    typeof (value as SaleRecord).totalCents === "number" &&
    typeof (value as SaleRecord).tenderedCents === "number" &&
    typeof (value as SaleRecord).changeCents === "number"
  );
}

function isAccountRecord(value: unknown): value is AccountRecord {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as AccountRecord).id === "string" &&
    typeof (value as AccountRecord).displayName === "string" &&
    typeof (value as AccountRecord).email === "string" &&
    typeof (value as AccountRecord).passwordHash === "string" &&
    typeof (value as AccountRecord).createdAtIso === "string"
  );
}

function isAuthState(value: unknown): value is AuthState {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as AuthState).users) &&
    ((value as AuthState).currentUserId === null ||
      typeof (value as AuthState).currentUserId === "string")
  );
}

function isSettings(value: unknown): value is AppSettings {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as AppSettings).pinRequired === "boolean" &&
    typeof (value as AppSettings).offlineMode === "boolean" &&
    typeof (value as AppSettings).compactNumbers === "boolean" &&
    typeof (value as AppSettings).printSummary === "boolean" &&
    typeof (value as AppSettings).startingCashCents === "number" &&
    Array.isArray((value as AppSettings).cashPresets)
  );
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function sortProducts(products: Product[]) {
  return [...products]
    .map((product, index) => ({
      ...product,
      sortOrder:
        typeof product.sortOrder === "number" && Number.isFinite(product.sortOrder)
          ? product.sortOrder
          : index,
    }))
    .sort((leftProduct, rightProduct) => leftProduct.sortOrder - rightProduct.sortOrder)
    .map((product, index) => ({
      ...product,
      sortOrder: index,
    }));
}

function getNextSortOrder(products: Product[]) {
  return products.length;
}

function moveProductBetween(
  products: Product[],
  sourceProductId: string,
  targetProductId: string,
) {
  const sortedProducts = sortProducts(products);
  const sourceIndex = sortedProducts.findIndex(
    (product) => product.id === sourceProductId,
  );
  const targetIndex = sortedProducts.findIndex(
    (product) => product.id === targetProductId,
  );

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return sortedProducts;
  }

  const nextProducts = [...sortedProducts];
  const [movedProduct] = nextProducts.splice(sourceIndex, 1);
  nextProducts.splice(targetIndex, 0, movedProduct);

  return nextProducts.map((product, index) => ({
    ...product,
    sortOrder: index,
  }));
}

async function hashAccountPassword(email: string, password: string) {
  const payload = `${email}::${password}`;

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encodedPayload = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest("SHA-256", encodedPayload);

    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  return payload;
}
