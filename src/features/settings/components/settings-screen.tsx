"use client";

import {
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  CloudOff,
  LockKeyhole,
  LogIn,
  LogOut,
  Printer,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { useTaptillStore } from "@/features/workspace/state/taptill-store";

export function SettingsScreen() {
  const {
    account,
    loginAccount,
    logoutAccount,
    registerAccount,
    replaceCashPreset,
    settings,
    updateSettings,
  } = useTaptillStore();
  const [startingCashInput, setStartingCashInput] = useState<null | string>(null);
  const [accountMode, setAccountMode] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerDisplayName, setRegisterDisplayName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountPending, setAccountPending] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const displayedStartingCash =
    startingCashInput ?? formatMoneyInput(settings.startingCashCents);

  const systemStatus = useMemo(
    () => [
      {
        label: "Konto",
        value: account.currentUser ? account.currentUser.displayName : "Brak",
      },
      { label: "PIN", value: settings.pinRequired ? "Wł." : "Wył." },
      { label: "Offline", value: settings.offlineMode ? "Wł." : "Wył." },
      { label: "Drukarka", value: settings.printSummary ? "Gotowa" : "Brak" },
      { label: "Eksport", value: "CSV / PDF" },
    ],
    [account.currentUser, settings.offlineMode, settings.pinRequired, settings.printSummary],
  );

  const handleAccountAction = async () => {
    setAccountPending(true);
    setAccountError(null);
    setAccountNotice(null);

    const result =
      accountMode === "login"
        ? await loginAccount({ email: loginEmail, password: loginPassword })
        : await registerAccount({
            displayName: registerDisplayName,
            email: registerEmail,
            password: registerPassword,
          });

    setAccountPending(false);

    if (!result.ok) {
      setAccountError(result.message);
      return;
    }

    setAccountNotice(result.message);
    setSaveToast(result.message);
    window.setTimeout(() => setSaveToast(null), 1200);

    if (accountMode === "login") {
      setLoginPassword("");
      return;
    }

    setRegisterDisplayName("");
    setRegisterEmail("");
    setRegisterPassword("");
  };

  return (
    <>
      <div className="h-full overflow-auto bg-surface-subtle px-4 py-4 sm:px-5 sm:py-5">
        <div className="mx-auto flex min-h-full max-w-[1620px] flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
              <h2 className="text-[28px] font-black tracking-[-0.07em] text-slate-950 sm:text-[34px]">
                Ustawienia
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                const startingCashCents = parseMoneyInput(displayedStartingCash);

                updateSettings({
                  startingCashCents: startingCashCents ?? 0,
                });
                setStartingCashInput(null);
                setSaveToast("Zapisano");
                window.setTimeout(() => setSaveToast(null), 1200);
              }}
              className="min-h-[52px] rounded-full bg-black px-5 text-[15px] font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)]"
            >
              Zapisz
            </button>
          </header>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-[32px] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)] sm:px-6">
              <SettingsSection title="Konto">
                {account.currentUser ? (
                  <div className="rounded-[26px] bg-slate-50 px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[22px] font-black tracking-[-0.05em] text-slate-950">
                          {account.currentUser.displayName}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          {account.currentUser.email}
                        </p>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                          Zalogowano
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          logoutAccount();
                          setAccountNotice("Wylogowano");
                          setAccountError(null);
                          setSaveToast("Wylogowano");
                          window.setTimeout(() => setSaveToast(null), 1200);
                        }}
                        className="flex min-h-[48px] items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-[15px] font-black text-slate-950"
                      >
                        <LogOut className="h-4 w-4" />
                        Wyloguj
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <ModeButton
                        active={accountMode === "login"}
                        label="Logowanie"
                        onClick={() => {
                          setAccountMode("login");
                          setAccountError(null);
                        }}
                      />
                      <ModeButton
                        active={accountMode === "register"}
                        label="Rejestracja"
                        onClick={() => {
                          setAccountMode("register");
                          setAccountError(null);
                        }}
                      />
                    </div>

                    <div className="mt-4 grid gap-3">
                      {accountMode === "register" ? (
                        <TextField
                          label="Nazwa"
                          value={registerDisplayName}
                          onChange={setRegisterDisplayName}
                        />
                      ) : null}

                      <TextField
                        label="E-mail"
                        value={accountMode === "login" ? loginEmail : registerEmail}
                        onChange={accountMode === "login" ? setLoginEmail : setRegisterEmail}
                        inputMode="email"
                      />
                      <TextField
                        label="Hasło"
                        value={accountMode === "login" ? loginPassword : registerPassword}
                        onChange={
                          accountMode === "login" ? setLoginPassword : setRegisterPassword
                        }
                        type="password"
                      />
                    </div>

                    {accountError ? (
                      <p className="mt-3 text-sm font-bold text-rose-600">{accountError}</p>
                    ) : null}
                    {accountNotice ? (
                      <p className="mt-3 text-sm font-bold text-emerald-600">
                        {accountNotice}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleAccountAction()}
                      disabled={accountPending}
                      className="mt-4 flex min-h-[52px] items-center gap-2 rounded-full bg-black px-5 text-[15px] font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.14)] disabled:bg-slate-300"
                    >
                      {accountMode === "login" ? (
                        <LogIn className="h-4 w-4" />
                      ) : (
                        <UserRoundPlus className="h-4 w-4" />
                      )}
                      {accountMode === "login" ? "Zaloguj" : "Utwórz konto"}
                    </button>
                  </div>
                )}
              </SettingsSection>

              <SettingsSection title="Sprzedaż i gotówka">
                <SettingsRow
                  title="Kompaktowe liczby"
                  body="1,2 tys. w raportach"
                  enabled={settings.compactNumbers}
                  onToggle={() =>
                    updateSettings({ compactNumbers: !settings.compactNumbers })
                  }
                />
                <SettingsRow
                  title="Drukuj podsumowanie"
                  body="wydruk po zamknięciu dnia"
                  enabled={settings.printSummary}
                  onToggle={() =>
                    updateSettings({ printSummary: !settings.printSummary })
                  }
                />
                <CurrencyRow
                  label="Kwota startowa dnia"
                  value={displayedStartingCash}
                  onChange={(value) => {
                    const normalizedValue = normalizeMoneyInput(value);
                    setStartingCashInput(normalizedValue);
                    const startingCashCents = parseMoneyInput(normalizedValue);

                    if (startingCashCents !== null) {
                      updateSettings({ startingCashCents });
                    }
                  }}
                />
                <div className="pt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Szybkie kwoty
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {settings.cashPresets.map((value, index) => (
                      <button
                        key={`${value}-${index}`}
                        type="button"
                        onClick={() => {
                          const nextValue = window.prompt(
                            `Nowa kwota dla przycisku ${index + 1}`,
                            formatMoneyInput(value),
                          );

                          if (!nextValue) {
                            return;
                          }

                          const nextCents = parseMoneyInput(nextValue);

                          if (nextCents === null) {
                            return;
                          }

                          replaceCashPreset(index, nextCents);
                        }}
                        className="min-h-[54px] rounded-full bg-slate-100 px-5 text-[18px] font-black tracking-[-0.04em] text-slate-950"
                      >
                        {formatMoneyInput(value)}
                      </button>
                    ))}
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection title="Bezpieczeństwo">
                <SettingsRow
                  title="PIN do edycji"
                  body="blokada wejścia w Kafelki i Ust."
                  enabled={settings.pinRequired}
                  onToggle={() => updateSettings({ pinRequired: !settings.pinRequired })}
                />
                <ValueRow label="PIN" value="••••" />
              </SettingsSection>

              <SettingsSection title="Urządzenie i eksport">
                <SettingsRow
                  title="Tryb offline"
                  body="działanie bez sieci"
                  enabled={settings.offlineMode}
                  onToggle={() => updateSettings({ offlineMode: !settings.offlineMode })}
                />
                <InfoRow
                  icon={Printer}
                  title="Drukarka"
                  body={settings.printSummary ? "gotowa" : "niepodłączona"}
                />
                <InfoRow
                  icon={CloudOff}
                  title="Eksport"
                  body="CSV / PDF"
                />
                <InfoRow
                  icon={LockKeyhole}
                  title="Waluta"
                  body="PLN"
                />
              </SettingsSection>
            </section>

            <aside className="rounded-[32px] bg-white px-5 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)] sm:px-6">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-[24px] font-black tracking-[-0.06em] text-slate-950">
                  Stan systemu
                </h3>
              </div>

              <div className="divide-y divide-slate-200">
                {systemStatus.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 py-4 text-[17px] font-black"
                  >
                    <span className="text-slate-500">{item.label}</span>
                    <span className="text-slate-950">{item.value}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div
        className={`pointer-events-none fixed left-1/2 top-5 z-20 -translate-x-1/2 rounded-full bg-black px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-success shadow-[0_24px_80px_rgba(0,0,0,0.32)] transition-all ${
          saveToast ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        }`}
      >
        {saveToast}
      </div>
    </>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 py-6 first:pt-0 last:border-b-0 last:pb-0">
      <h3 className="text-[24px] font-black tracking-[-0.06em] text-slate-950">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
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
      className={`min-h-[46px] rounded-full px-4 text-[15px] font-black transition ${
        active
          ? "bg-black text-white"
          : "border border-slate-300 bg-white text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        className="min-h-[54px] w-full rounded-[18px] border border-slate-200 bg-white px-4 text-[16px] font-bold text-slate-950 outline-none transition focus:border-slate-950"
      />
    </label>
  );
}

function SettingsRow({
  title,
  body,
  enabled,
  onToggle,
}: {
  title: string;
  body: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 border-b border-slate-200 py-4 text-left last:border-b-0"
    >
      <div>
        <p className="text-[19px] font-black tracking-[-0.04em] text-slate-950">
          {title}
        </p>
        <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
          {body}
        </p>
      </div>
      <span
        className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
          enabled ? "justify-end bg-black" : "justify-start bg-slate-300"
        }`}
      >
        <span className="h-6 w-6 rounded-full bg-white" />
      </span>
    </button>
  );
}

function CurrencyRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-b border-slate-200 py-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[17px] font-black text-slate-500">{label}</span>
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            inputMode="decimal"
            className="w-[112px] border-none bg-transparent text-right text-[17px] font-black text-slate-950 outline-none"
          />
          <span className="text-[17px] font-black text-slate-950">zł</span>
        </div>
      </div>
    </div>
  );
}

function ValueRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-4 text-[17px] font-black">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-950">{value}</span>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Printer;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-200 py-4 last:border-b-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[18px] font-black tracking-[-0.04em] text-slate-950">
          {title}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-500">{body}</p>
      </div>
    </div>
  );
}

function normalizeMoneyInput(value: string) {
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

function parseMoneyInput(value: string) {
  if (!value || value === ".") {
    return null;
  }

  const parsedValue = Number.parseFloat(value.replace(",", "."));

  if (Number.isNaN(parsedValue)) {
    return null;
  }

  return Math.max(0, Math.round(parsedValue * 100));
}

function formatMoneyInput(cents: number) {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}
