import { formatUnits, parseUnits, keccak256, toHex } from 'viem';

export const USDC_DECIMALS = 6;

export const STATUS_NAMES = [
  'None',
  'Listed',
  'Funded',
  'Disbursed',
  'Settled',
  'Defaulted',
  'Cancelled',
] as const;

export function formatUSDC(raw: bigint | undefined): string {
  if (raw === undefined) return '—';
  const amount = Number(formatUnits(raw, USDC_DECIMALS));
  return amount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseUSDC(input: string): bigint {
  const cleaned = input.replace(/,/g, '').trim();
  return parseUnits(cleaned || '0', USDC_DECIMALS);
}

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

export function shortHex(hex: string): string {
  return `${hex.slice(0, 8)}…${hex.slice(-6)}`;
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
