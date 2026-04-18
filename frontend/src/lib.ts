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

// --- Per-receivable risk profile registry ---

export type RiskProfile = {
  staking: StakingLevel;
  reputation: ReputationLevel;
  documents: DocumentsUploaded;
};

const RISK_KEY = 'aforo:riskProfiles:v1';

export function saveRiskProfile(receivableId: number | bigint, profile: RiskProfile) {
  if (typeof localStorage === 'undefined') return;
  let store: Record<string, RiskProfile> = {};
  try { store = JSON.parse(localStorage.getItem(RISK_KEY) ?? '{}'); } catch {}
  store[String(receivableId)] = profile;
  localStorage.setItem(RISK_KEY, JSON.stringify(store));
}

export function readRiskProfile(receivableId: number | bigint): RiskProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const store = JSON.parse(localStorage.getItem(RISK_KEY) ?? '{}');
    return store[String(receivableId)] ?? null;
  } catch {
    return null;
  }
}

/** 0–100 confidence score derived from the three blindaje factors.
 *  Useful for a single visual indicator on the Lender side. */
export function trustScore(p: RiskProfile | null): number {
  if (!p) return 0;
  let s = 0;
  // Staking (40 pts)
  s += ({ none: 0, low: 15, medium: 28, high: 40 } as const)[p.staking];
  // Reputation (35 pts)
  s += ({ new: 0, emerging: 12, established: 24, veteran: 35 } as const)[p.reputation];
  // Docs (25 pts)
  s += (Number(p.documents.factura) + Number(p.documents.contrato) + Number(p.documents.cartaBanco)) * 8;
  return Math.min(100, s);
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

export type StakingLevel = 'none' | 'low' | 'medium' | 'high';
export type ReputationLevel = 'new' | 'emerging' | 'established' | 'veteran';
export type DocumentsUploaded = { factura: boolean; contrato: boolean; cartaBanco: boolean };

export const STAKING_LEVELS: { value: StakingLevel; label: string; delta: number }[] = [
  { value: 'none',   label: 'Sin colateral', delta: +300 },
  { value: 'low',    label: '5% del monto stakeado', delta: +50 },
  { value: 'medium', label: '10% del monto stakeado', delta: -30 },
  { value: 'high',   label: '20%+ del monto stakeado', delta: -70 },
];

export const REPUTATION_LEVELS: { value: ReputationLevel; label: string; delta: number }[] = [
  { value: 'new',        label: 'Primera operación (sin historial)', delta: +250 },
  { value: 'emerging',   label: '1–10 operaciones cerradas', delta: +50 },
  { value: 'established',label: '10–50 operaciones cerradas', delta: -30 },
  { value: 'veteran',    label: '50+ operaciones cerradas', delta: -70 },
];

export type ScoringInputs = {
  amount: number;       // MXN
  termDays: number;
  institution: Institution;
  knownClient: boolean;
  staking: StakingLevel;
  reputation: ReputationLevel;
  documents: DocumentsUploaded;
};

export type ScoringOutput = {
  discountBps: number;
  discountPct: string;  // "2.15"
  reasons: string[];
  benchmarkCat: string;
  ourCatAnnualized: string;
};

export function scoreDiscount({
  amount, termDays, institution, knownClient, staking, reputation, documents,
}: ScoringInputs): ScoringOutput {
  let bps = 250; // base 2.50% with room for penalties
  const reasons: string[] = [];

  const inst = INSTITUTIONS.find(i => i.value === institution) ?? INSTITUTIONS[6];
  bps += inst.riskBps;
  if (inst.riskBps <= -40) reasons.push(`${inst.label} es banco top — liquidación confiable.`);
  else if (inst.riskBps >= 50) reasons.push(`Sin banco detrás — riesgo alto, descuento más amplio.`);
  else if (inst.riskBps < 0) reasons.push(`${inst.label}: riesgo medio.`);
  else reasons.push(`${inst.label}: riesgo base.`);

  if (amount >= 1_000_000) { bps -= 20; reasons.push(`Monto alto: margen apretado por escala.`); }
  else if (amount <= 200_000) { bps += 15; reasons.push(`Monto bajo: ajuste al alza por unit economics.`); }

  if (termDays <= 21) { bps -= 15; reasons.push(`Plazo corto (${termDays} días): menos exposición.`); }
  else if (termDays >= 60) { bps += 40; reasons.push(`Plazo largo (${termDays} días): más exposición.`); }

  if (knownClient) { bps -= 25; reasons.push(`Cliente recurrente: track record.`); }

  // --- Blindajes estructurales (los que realmente movían la aguja) -------
  const stake = STAKING_LEVELS.find(s => s.value === staking) ?? STAKING_LEVELS[0];
  bps += stake.delta;
  if (stake.delta > 100) reasons.push(`⚠️ Sin colateral del dealer: si inventa la venta los lenders absorben todo. +${stake.delta} bps.`);
  else if (stake.delta > 0) reasons.push(`Colateral limitado (${stake.label}): cubre solo parte del riesgo.`);
  else reasons.push(`Colateral sólido (${stake.label}): skin in the game real.`);

  const rep = REPUTATION_LEVELS.find(r => r.value === reputation) ?? REPUTATION_LEVELS[0];
  bps += rep.delta;
  if (rep.delta > 100) reasons.push(`⚠️ Dealer nuevo: cero historial de settlements en Aforo. +${rep.delta} bps.`);
  else if (rep.delta > 0) reasons.push(`Reputación emergente: historial corto en la plataforma.`);
  else reasons.push(`Reputación establecida: track record extenso de settlements a tiempo.`);

  const docCount = Number(documents.factura) + Number(documents.contrato) + Number(documents.cartaBanco);
  if (docCount === 3) {
    bps -= 100;
    reasons.push(`Documentación completa (factura + contrato + carta bancaria): verificable fuera de cadena.`);
  } else if (docCount === 2) {
    bps -= 40;
    reasons.push(`Documentación parcial (${docCount} de 3): riesgo acotado.`);
  } else if (docCount === 1) {
    bps += 50;
    reasons.push(`⚠️ Documentación incompleta (${docCount} de 3): verificación limitada.`);
  } else {
    bps += 150;
    reasons.push(`⚠️ Sin documentos: los lenders no pueden verificar que la venta existe. +150 bps.`);
  }

  bps = Math.max(100, Math.min(1500, bps));

  const discountPct = (bps / 100).toFixed(2);
  const periods = 365 / Math.max(1, termDays);
  const ourCatAnnualized = (((1 + bps / 10000) ** periods - 1) * 100).toFixed(0);

  return {
    discountBps: bps,
    discountPct,
    reasons,
    benchmarkCat: '25–40',
    ourCatAnnualized,
  };
}
