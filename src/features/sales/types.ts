export type Category = {
  id: string;
  label: string;
};

export type Product = {
  id: string;
  name: string;
  priceCents: number;
  categoryId: null | string;
  accentColor: string;
  imageDataUrl: null | string;
  imagePositionX: number;
  imagePositionY: number;
  isSpacer: boolean;
  sortOrder: number;
};

export type OrderItems = Record<string, number>;

export type SaleItemRecord = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
};

export type SaleRecord = {
  id: string;
  createdAtIso: string;
  createdAtLabel: string;
  items: SaleItemRecord[];
  totalCents: number;
  tenderedCents: number;
  changeCents: number;
};

export type AccountRecord = {
  id: string;
  displayName: string;
  email: string;
  passwordHash: string;
  createdAtIso: string;
};

export type AuthState = {
  users: AccountRecord[];
  currentUserId: null | string;
};

export type AppSettings = {
  pinRequired: boolean;
  offlineMode: boolean;
  compactNumbers: boolean;
  printSummary: boolean;
  startingCashCents: number;
  cashPresets: number[];
};

export type TaptillStoredState = {
  categories: Category[];
  products: Product[];
  sales: SaleRecord[];
  auth: AuthState;
  settings: AppSettings;
};
