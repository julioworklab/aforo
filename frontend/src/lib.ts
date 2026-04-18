import { formatUnits, parseUnits, keccak256, toHex } from 'viem';

export const TOKEN_DECIMALS = 6;

/** Formats a bigint amount into Mexican-peso-style string (no currency suffix).
 *  Drops decimals when amount is a whole number for readability. */
export function formatMXN(raw: bigint | undefined, opts: { showDecimals?: boolean } = {}): string {
  if (raw === undefined) return '—';
  const amount = Number(formatUnits(raw, TOKEN_DECIMALS));
  const showDecimals = opts.showDecimals ?? (amount % 1 !== 0);
  return amount.toLocaleString('es-MX', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
}

/** Alias kept for legacy callers. */
export const formatUSDC = formatMXN;

export function parseMXN(input: string): bigint {
  const cleaned = input.replace(/,/g, '').replace(/\$/g, '').trim();
  return parseUnits(cleaned || '0', TOKEN_DECIMALS);
}

export const parseUSDC = parseMXN;

export function statusPillClass(status: number): string {
  switch (status) {
    case 1: return 'pill pill-listed';
    case 2: return 'pill pill-funded';
    case 3: return 'pill pill-disbursed';
    case 4: return 'pill pill-settled';
    case 5: return 'pill pill-default';
    case 6: return 'pill pill-cancelled';
    default: return 'pill pill-cancelled';
  }
}

export function statusLabel(status: number): string {
  switch (status) {
    case 1: return 'En subasta';
    case 2: return 'Fondeado';
    case 3: return 'Desembolsado';
    case 4: return 'Liquidado';
    case 5: return 'En default';
    case 6: return 'Cancelado';
    default: return '—';
  }
}

export function offchainRef(label: string): `0x${string}` {
  return keccak256(toHex(label));
}

export function daysFromNow(days: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + days * 86400);
}

export function formatDeadline(unixSeconds: bigint): string {
  return new Date(Number(unixSeconds) * 1000).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export type Receivable = {
  dealer: `0x${string}`;
  faceValue: bigint;
  discountBps: bigint;
  protocolFeeBps: bigint;
  fundingGoal: bigint;
  fundedAmount: bigint;
  settlementDeadline: bigint;
  offchainRef: `0x${string}`;
  status: number;
  settledAmount: bigint;
};

/** Annualize a period return given the number of days the capital was deployed.
 *  Returns APY in percent (e.g. 30.5 for 30.5% per year).
 *  Uses compounding: APY = (1 + r)^(365/T) - 1. */
export function annualizePct(periodReturn: number, termDays: number): number {
  if (termDays <= 0 || periodReturn <= 0) return 0;
  return ((1 + periodReturn) ** (365 / termDays) - 1) * 100;
}

// --- Local timing stamps (hackathon workaround: Monad testnet RPC limits
// eth_getLogs to 100 blocks, so we can't easily pull historical events.
// We persist the tx time in localStorage the moment the user kicks it off.) ---

const TIMINGS_KEY = 'aforo:timings:v1';

type TimingStore = Record<string, number>; // unix seconds

function readStore(): TimingStore {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(TIMINGS_KEY) ?? '{}'); }
  catch { return {}; }
}

function writeStore(s: TimingStore) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(TIMINGS_KEY, JSON.stringify(s));
}

export function stampTiming(action: 'fund' | 'claim', id: bigint, address: string) {
  const s = readStore();
  s[`${action}:${String(id)}:${address.toLowerCase()}`] = Math.floor(Date.now() / 1000);
  writeStore(s);
}

export function readTiming(action: 'fund' | 'claim', id: bigint, address: string): number | null {
  const s = readStore();
  return s[`${action}:${String(id)}:${address.toLowerCase()}`] ?? null;
}

// ===== Agente Aforo — scoring engine en el navegador ========================

export type Institution =
  | 'bbva'
  | 'santander'
  | 'banorte'
  | 'hsbc'
  | 'banregio'
  | 'sofom_externa'
  | 'financiera_dealer'
  | 'credito_directo';

export const INSTITUTIONS: { value: Institution; label: string; riskBps: number }[] = [
  { value: 'bbva', label: 'BBVA México', riskBps: -50 },
  { value: 'santander', label: 'Santander', riskBps: -50 },
  { value: 'banorte', label: 'Banorte', riskBps: -50 },
  { value: 'hsbc', label: 'HSBC', riskBps: -40 },
  { value: 'banregio', label: 'Banregio', riskBps: -30 },
  { value: 'sofom_externa', label: 'SOFOM externa', riskBps: -10 },
  { value: 'financiera_dealer', label: 'Financiera del lote', riskBps: 0 },
  { value: 'credito_directo', label: 'Crédito directo al cliente (sin banco)', riskBps: 80 },
];

export type ScoringInputs = {
  amount: number;       // MXN
  termDays: number;
  institution: Institution;
  knownClient: boolean;
};

export type ScoringOutput = {
  discountBps: number;
  discountPct: string;  // "2.15"
  reasons: string[];
  benchmarkCat: string;
  ourCatAnnualized: string;
};

export function scoreDiscount({ amount, termDays, institution, knownClient }: ScoringInputs): ScoringOutput {
  let bps = 300; // base 3.00%
  const reasons: string[] = [];

  const inst = INSTITUTIONS.find(i => i.value === institution) ?? INSTITUTIONS[6];
  bps += inst.riskBps;
  if (inst.riskBps <= -40) reasons.push(`${inst.label} es banco top — liquidación confiable, descuento más bajo.`);
  else if (inst.riskBps >= 50) reasons.push(`Sin banco detrás — riesgo más alto, descuento más amplio.`);
  else if (inst.riskBps < 0) reasons.push(`${inst.label}: riesgo medio, descuento ajustado.`);
  else reasons.push(`${inst.label}: tomamos el descuento base.`);

  if (amount >= 1_000_000) { bps -= 20; reasons.push(`Monto alto ($${amount.toLocaleString('es-MX')}): escala, margen más apretado.`); }
  else if (amount <= 200_000) { bps += 15; reasons.push(`Monto bajo ($${amount.toLocaleString('es-MX')}): unit economics más delgados, pequeño ajuste al alza.`); }
  else reasons.push(`Monto medio ($${amount.toLocaleString('es-MX')}): en rango típico.`);

  if (termDays <= 21) { bps -= 15; reasons.push(`Plazo corto (${termDays} días): menos riesgo temporal.`); }
  else if (termDays >= 60) { bps += 40; reasons.push(`Plazo largo (${termDays} días): más exposición, ajuste al alza.`); }
  else reasons.push(`Plazo estándar (${termDays} días).`);

  if (knownClient) { bps -= 25; reasons.push(`Cliente recurrente: track record positivo, descuento más bajo.`); }

  bps = Math.max(150, Math.min(600, bps));

  const discountPct = (bps / 100).toFixed(2);
  // Convert period discount to approximate annualized CAT for comparison purposes.
  const periods = 365 / Math.max(1, termDays);
  const ourCatAnnualized = (((1 + bps / 10000) ** periods - 1) * 100).toFixed(1);

  return {
    discountBps: bps,
    discountPct,
    reasons,
    benchmarkCat: '25–40',
    ourCatAnnualized,
  };
}
