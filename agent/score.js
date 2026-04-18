#!/usr/bin/env node
/**
 * Aforo scoring agent.
 *
 * Reads the dealer's real sales pipeline (Monday.com) and produces a plain-
 * language risk assessment + recommended discount for each confirmed sale
 * that is waiting on the financing counterparty to settle.
 *
 * Usage:
 *   MONDAY_API_TOKEN=... node score.js
 *   MONDAY_API_TOKEN=... node score.js --submit   # (future) submits to contract
 *
 * Design principles (from the project's feedback memory):
 *   - Scoring is deterministic and explainable, not a black-box LLM call.
 *   - Rules are legible (Spanish) so a lender can audit them.
 *   - We anonymize buyer names in any output that could leak PII.
 */

import 'dotenv/config';

const MONDAY_TOKEN = process.env.MONDAY_API_TOKEN;
if (!MONDAY_TOKEN) {
  console.error('Falta MONDAY_API_TOKEN en env.');
  process.exit(1);
}

const BOARDS = {
  FINANCIAMIENTO: '18398714963',
  VENTAS: '18397931778',
  INGRESOS: '18399065825',
};

async function mondayQuery(query) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: MONDAY_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data.data;
}

async function fetchFinancingPipeline() {
  const q = `{
    boards(ids: [${BOARDS.FINANCIAMIENTO}, ${BOARDS.VENTAS}]) {
      id name
      items_page(limit: 50) {
        items {
          id name
          column_values { id text value column { title } }
        }
      }
    }
  }`;
  return mondayQuery(q);
}

// --- Anonymization -----------------------------------------------------

function anonymizeName(full) {
  if (!full) return 'Cliente';
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0] + '.';
  return `${parts[0]} ${parts[1][0]}.`;
}

// --- Deterministic scoring ---------------------------------------------

function scoreReceivable(sale) {
  // Signals available from the pipeline:
  //  - Amount (higher = tighter margin but more capital efficient)
  //  - Source ("Recomendado" > "Marketplace" > "Mercadolibre" > "Por definir")
  //  - Time from first contact to sale (shorter = buyer intent strong)
  //  - Financing status (approved = near-certain settlement)
  //  - Dealer historical on-time rate (out of scope in v0 — placeholder)
  //
  // Output: baseDiscount in bps + human-readable reasoning.

  const reasons = [];
  let baseDiscount = 300; // 3% floor

  const amount = sale.amount ?? 0;
  if (amount >= 1_000_000) {
    reasons.push(`Monto alto ($${amount.toLocaleString('es-MX')}): margen reducido pero escala.`);
    baseDiscount -= 30;
  } else if (amount <= 200_000) {
    reasons.push(`Monto bajo ($${amount.toLocaleString('es-MX')}): el descuento base aplica directo.`);
    baseDiscount += 20;
  } else {
    reasons.push(`Monto medio ($${amount.toLocaleString('es-MX')}): en rango típico.`);
  }

  const src = (sale.fuente ?? '').toLowerCase();
  if (src.includes('recomendad')) {
    reasons.push('Cliente recomendado: fuente de mayor calidad histórica.');
    baseDiscount -= 25;
  } else if (src.includes('market') || src.includes('mercadolib')) {
    reasons.push('Cliente de marketplace abierto: leve ajuste al alza por riesgo.');
    baseDiscount += 15;
  }

  if (sale.financingStatus === 'listo' || sale.financingStatus === 'aprobado') {
    reasons.push('Documentación y aprobación de financiera ya listas: liquidación casi cierta.');
    baseDiscount -= 20;
  } else if (sale.financingStatus === 'en proceso') {
    reasons.push('Financiamiento en proceso: riesgo operacional moderado.');
  } else {
    reasons.push('Estado de financiamiento no confirmado: se ajusta al alza.');
    baseDiscount += 30;
  }

  if (sale.daysToClose != null && sale.daysToClose <= 21) {
    reasons.push(`Cierre rápido (${sale.daysToClose} días desde primer contacto): intención fuerte del buyer.`);
    baseDiscount -= 10;
  }

  // Clamp
  baseDiscount = Math.max(150, Math.min(500, baseDiscount));

  return {
    recommendedDiscountBps: baseDiscount,
    discountPct: (baseDiscount / 100).toFixed(2),
    reasons,
  };
}

// --- Monday data shaping ------------------------------------------------

function cv(item, title) {
  const c = item.column_values.find(c => c.column.title === title);
  return c?.text ?? null;
}

function fmt(r) {
  const lines = [];
  lines.push('━'.repeat(72));
  lines.push(`📄 Venta #${r.salesId}: ${r.anonName} — ${r.concept}`);
  lines.push(`   Monto: $${r.amount.toLocaleString('es-MX')} MXN`);
  lines.push(`   Fuente: ${r.fuente ?? '—'}  ·  Estado financiamiento: ${r.financingStatus ?? '—'}`);
  if (r.daysToClose != null) lines.push(`   Días a cierre: ${r.daysToClose}`);
  lines.push('');
  lines.push(`💡 Recomendación Aforo:`);
  lines.push(`   Descuento sugerido: ${r.score.discountPct}% (${r.score.recommendedDiscountBps} bps)`);
  lines.push(`   Tu negocio recibe hoy: $${(r.amount * (1 - r.score.recommendedDiscountBps / 10000) * 0.995).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`);
  lines.push(`   (después del 0.5% de fee de plataforma)`);
  lines.push('');
  lines.push(`📋 Razonamiento:`);
  r.score.reasons.forEach(reason => lines.push(`   • ${reason}`));
  return lines.join('\n');
}

// --- Main ---------------------------------------------------------------

async function main() {
  console.log('🌱 Aforo — agente de scoring');
  console.log('   Leyendo pipeline de Trébol Motors vía Monday.com...\n');

  const data = await fetchFinancingPipeline();
  const financing = data.boards.find(b => b.id === BOARDS.FINANCIAMIENTO);
  const sales = data.boards.find(b => b.id === BOARDS.VENTAS);

  // Index financing requests by associated sale
  const finByName = new Map();
  for (const item of financing.items_page.items) {
    finByName.set(item.name.toLowerCase(), {
      status: (cv(item, '🔽 Status') ?? '').toLowerCase(),
      docs: (cv(item, '🔽 Documentación') ?? '').toLowerCase(),
      solicitud: (cv(item, '🔽 Solicitud') ?? '').toLowerCase(),
      aprobacion: (cv(item, '🔽 Aprobación') ?? '').toLowerCase(),
    });
  }

  const candidates = [];
  for (const item of sales.items_page.items) {
    const tipo = cv(item, '🔽 Tipo') ?? '';
    if (!tipo.toLowerCase().includes('financiamiento')) continue;
    const salePrice = parseFloat(cv(item, '💰 Venta final') ?? '0');
    if (!salePrice || salePrice <= 0) continue;

    const firstContact = cv(item, '📆 Primer contacto');
    const saleDate = cv(item, '🏁 Fecha de venta');
    let daysToClose = null;
    if (firstContact && saleDate) {
      const a = new Date(firstContact);
      const b = new Date(saleDate);
      daysToClose = Math.max(0, Math.round((b - a) / 86400000));
    }

    const fin = finByName.get(item.name.toLowerCase()) ?? {};
    let financingStatus = 'desconocido';
    if (fin.aprobacion === 'listo') financingStatus = 'listo';
    else if (fin.docs === 'listo' || fin.solicitud === 'listo') financingStatus = 'en proceso';

    const rec = {
      salesId: item.id,
      name: item.name,
      anonName: anonymizeName(item.name),
      concept: `venta ${tipo}`,
      amount: salePrice,
      fuente: cv(item, '🔎 Fuente'),
      financingStatus,
      daysToClose,
    };
    rec.score = scoreReceivable(rec);
    candidates.push(rec);
  }

  if (candidates.length === 0) {
    console.log('No hay ventas con financiamiento pendientes en el pipeline.');
    return;
  }

  console.log(`Se encontraron ${candidates.length} venta(s) candidata(s) para Aforo:\n`);
  for (const c of candidates) console.log(fmt(c));
  console.log('━'.repeat(72));
  console.log(`\nTotal de capital potencial tokenizable: $${candidates.reduce((s, c) => s + c.amount, 0).toLocaleString('es-MX')} MXN`);
  console.log(`Ganancia total para prestamistas si todo liquida: $${candidates.reduce((s, c) => s + c.amount * c.score.recommendedDiscountBps / 10000, 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
