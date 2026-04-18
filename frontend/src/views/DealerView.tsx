import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { CONTRACTS } from '../config';
import rmAbi from '../receivable-market-abi.json';
import usdcAbi from '../mock-usdc-abi.json';
import {
  formatMXN, parseMXN, statusPillClass, statusLabel,
  offchainRef, daysFromNow, formatDeadline, type Receivable,
  scoreDiscount, INSTITUTIONS, type Institution,
  STAKING_LEVELS, REPUTATION_LEVELS,
  type StakingLevel, type ReputationLevel, type DocumentsUploaded,
  saveRiskProfile,
} from '../lib';

export default function DealerView() {
  const { address } = useAccount();

  // Form state
  const [dealName, setDealName] = useState('Audi Q5');
  const [faceMXN, setFaceMXN] = useState('1080000');
  const [discount, setDiscount] = useState('3.00');
  const [deadlineDays, setDeadlineDays] = useState('28');
  const [institution, setInstitution] = useState<Institution>('bbva');
  const [knownClient, setKnownClient] = useState(true);
  const [userOverrodeDiscount, setUserOverrodeDiscount] = useState(false);

  // Risk profile state (the blindajes)
  const [staking, setStaking] = useState<StakingLevel>('none');
  const [reputation, setReputation] = useState<ReputationLevel>('new');
  const [documents, setDocuments] = useState<DocumentsUploaded>({
    factura: false,
    contrato: false,
    cartaBanco: false,
  });

  // Agent scoring — re-runs as form changes
  const scoring = useMemo(() => {
    const amount = parseFloat(faceMXN.replace(/[,\s$]/g, '')) || 0;
    const termDays = parseInt(deadlineDays) || 28;
    return scoreDiscount({
      amount, termDays, institution, knownClient, staking, reputation, documents,
    });
  }, [faceMXN, deadlineDays, institution, knownClient, staking, reputation, documents]);

  // Keep the discount field in sync with the agent unless user manually overrode it.
  useEffect(() => {
    if (!userOverrodeDiscount) {
      setDiscount(scoring.discountPct);
    }
  }, [scoring.discountPct, userOverrodeDiscount]);

  // Tx state
  const { writeContractAsync, isPending } = useWriteContract();
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: txConfirming, isSuccess: txDone } = useWaitForTransactionReceipt({ hash: lastTxHash });

  const { data: nextId, refetch: refetchCount } = useReadContract({
    address: CONTRACTS.ReceivableMarket,
    abi: rmAbi,
    functionName: 'nextReceivableId',
    query: { refetchInterval: 5000 },
  });

  const total = nextId ? Number(nextId as bigint) : 0;
  const ids = Array.from({ length: total }, (_, i) => BigInt(i + 1));
  const { data: allReceivables, refetch: refetchAll } = useReadContracts({
    contracts: ids.map(id => ({
      address: CONTRACTS.ReceivableMarket,
      abi: rmAbi as any,
      functionName: 'getReceivable',
      args: [id],
    })),
    query: { refetchInterval: 5000 },
  });

  useEffect(() => {
    if (txDone) {
      refetchCount();
      refetchAll();
    }
  }, [txDone, refetchCount, refetchAll]);

  const myReceivables = (allReceivables ?? []).map((r, i) => ({
    id: ids[i],
    data: r.result as unknown as Receivable | undefined,
  })).filter(r => r.data && r.data.dealer.toLowerCase() === address?.toLowerCase());

  async function createReceivable() {
    const face = parseMXN(faceMXN);
    const bps = BigInt(Math.round(parseFloat(discount) * 100));
    const deadline = daysFromNow(parseInt(deadlineDays));
    const ref = offchainRef(dealName);
    const hash = await writeContractAsync({
      address: CONTRACTS.ReceivableMarket,
      abi: rmAbi,
      functionName: 'listReceivable',
      args: [face, bps, 50n, deadline, ref],
    });
    setLastTxHash(hash);
    // Attach risk profile to the id this tx is about to create.
    const newId = (nextId ? Number(nextId as bigint) : 0) + 1;
    saveRiskProfile(newId, { staking, reputation, documents });
  }

  async function disburse(id: bigint) {
    const hash = await writeContractAsync({
      address: CONTRACTS.ReceivableMarket,
      abi: rmAbi,
      functionName: 'disburseToDealer',
      args: [id],
    });
    setLastTxHash(hash);
  }

  async function approveAndSettle(id: bigint, faceValue: bigint) {
    const approveHash = await writeContractAsync({
      address: CONTRACTS.MockUSDC,
      abi: usdcAbi,
      functionName: 'approve',
      args: [CONTRACTS.ReceivableMarket, faceValue],
    });
    setLastTxHash(approveHash);
    setTimeout(async () => {
      const settleHash = await writeContractAsync({
        address: CONTRACTS.ReceivableMarket,
        abi: rmAbi,
        functionName: 'settleReceivable',
        args: [id],
      });
      setLastTxHash(settleHash);
    }, 3000);
  }

  async function cancel(id: bigint) {
    const hash = await writeContractAsync({
      address: CONTRACTS.ReceivableMarket,
      abi: rmAbi,
      functionName: 'cancelReceivable',
      args: [id],
    });
    setLastTxHash(hash);
  }

  async function mintTestUSDC() {
    const hash = await writeContractAsync({
      address: CONTRACTS.MockUSDC,
      abi: usdcAbi,
      functionName: 'mint',
      args: [address, parseMXN('2000000')],
    });
    setLastTxHash(hash);
  }

  const faceValueBig = parseMXN(faceMXN);
  const discountBps = BigInt(Math.round((parseFloat(discount) || 0) * 100));
  const fundingGoal = discountBps > 0n ? (faceValueBig * (10000n - discountBps)) / 10000n : 0n;

  return (
    <div>
      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>Registrar una nueva venta por cobrar</div>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
          Acabas de vender algo a plazos o con financiamiento del banco. Aquí lo registras para que te adelantemos la lana hoy mismo.
        </p>

        <div className="row" style={{ marginBottom: 12 }}>
          <div style={{ flex: 2 }}>
            <label>Nombre de la venta (interno)</label>
            <input value={dealName} onChange={e => setDealName(e.target.value)} placeholder="Ej: Audi Q5" />
          </div>
          <div>
            <label>Monto total ($MXN)</label>
            <input value={faceMXN} onChange={e => setFaceMXN(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <label>Plazo de cobro (días)</label>
            <input value={deadlineDays} onChange={e => setDeadlineDays(e.target.value)} inputMode="numeric" />
          </div>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <div style={{ flex: 2 }}>
            <label>¿Quién va a pagar?</label>
            <select value={institution} onChange={e => setInstitution(e.target.value as Institution)}>
              {INSTITUTIONS.map(i => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 220, flex: 1 }}>
            <label>&nbsp;</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 13, color: '#ccc', padding: '10px 12px', border: '1px solid #2a2a3a', borderRadius: 8, background: '#13131a', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={knownClient}
                onChange={e => setKnownClient(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Cliente recurrente
            </label>
          </div>
        </div>

        {/* Perfil del negocio — blindajes estructurales que bajan el descuento */}
        <div style={{ background: '#0c0c12', border: '1px solid #1f1f2e', padding: 14, borderRadius: 10, marginBottom: 12 }}>
          <div className="section-title" style={{ marginTop: 0, marginBottom: 10 }}>
            🛡️ Perfil del negocio · blindajes que bajan el descuento
          </div>
          <p style={{ color: '#888', fontSize: 12, marginTop: 0, marginBottom: 12 }}>
            Mientras más blindajes tengas, menos riesgo absorben los prestamistas, y más barato te sale pedir el adelanto.
          </p>

          <div className="row" style={{ marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Colateral stakeado</label>
              <select value={staking} onChange={e => setStaking(e.target.value as StakingLevel)}>
                {STAKING_LEVELS.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label} {s.delta >= 0 ? `(+${s.delta} bps)` : `(${s.delta} bps)`}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Historial en Aforo</label>
              <select value={reputation} onChange={e => setReputation(e.target.value as ReputationLevel)}>
                {REPUTATION_LEVELS.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label} {r.delta >= 0 ? `(+${r.delta} bps)` : `(${r.delta} bps)`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ marginBottom: 8 }}>Documentos subidos (cada uno baja el descuento)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'factura' as const, label: '📄 Factura de venta' },
                { key: 'contrato' as const, label: '📑 Contrato de compraventa' },
                { key: 'cartaBanco' as const, label: '🏦 Carta de aprobación del banco' },
              ].map(doc => {
                const on = documents[doc.key];
                return (
                  <label
                    key={doc.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      textTransform: 'none', letterSpacing: 0, fontSize: 12,
                      color: on ? 'white' : '#aaa',
                      padding: '8px 12px',
                      border: `1px solid ${on ? '#86ffc6' : '#2a2a3a'}`,
                      borderRadius: 8,
                      background: on ? 'rgba(134, 255, 198, 0.08)' : '#13131a',
                      marginBottom: 0,
                      flex: '1 1 auto',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={e => setDocuments({ ...documents, [doc.key]: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    {doc.label}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Agent recommendation card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(131,110,249,0.1), rgba(160,5,93,0.08))', border: '1px solid rgba(131,110,249,0.25)', padding: 14, borderRadius: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#b9a6ff', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              💡 Agente Aforo sugiere
            </div>
            {userOverrodeDiscount && (
              <button
                className="ghost"
                onClick={() => setUserOverrodeDiscount(false)}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                Usar sugerencia
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'white' }}>{scoring.discountPct}%</div>
            <div style={{ fontSize: 13, color: '#888' }}>descuento sobre la venta · equivalente a <strong style={{ color: '#b9a6ff' }}>{scoring.ourCatAnnualized}% CAT anualizado</strong></div>
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            <strong style={{ color: '#ff8a8a' }}>Factoring tradicional:</strong> {scoring.benchmarkCat}% CAT típico.
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#aaa', lineHeight: 1.7 }}>
            {scoring.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        <div className="row" style={{ marginBottom: 12 }}>
          <div>
            <label>Descuento final (puedes ajustar)</label>
            <input
              value={discount}
              onChange={e => { setDiscount(e.target.value); setUserOverrodeDiscount(true); }}
              inputMode="decimal"
            />
          </div>
        </div>

        <div style={{ marginTop: 14, background: '#0c0c12', border: '1px solid #1f1f2e', padding: 14, borderRadius: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Recibirías hoy (después del 0.5% de plataforma):</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#86ffc6', letterSpacing: -0.5 }}>
              ${formatMXN((fundingGoal * 9950n) / 10000n)} <span style={{ fontSize: 14, color: '#888', fontWeight: 400 }}>MXN</span>
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              De ${formatMXN(faceValueBig)} MXN que te va a pagar el banco en {deadlineDays} días.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Costo por operación (descuento + plataforma):</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ff8a8a', letterSpacing: -0.5 }}>
              −${formatMXN(faceValueBig - ((fundingGoal * 9950n) / 10000n))} <span style={{ fontSize: 14, color: '#888', fontWeight: 400 }}>MXN</span>
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {faceValueBig > 0n
                ? ((Number(faceValueBig - ((fundingGoal * 9950n) / 10000n)) / Number(faceValueBig)) * 100).toFixed(2)
                : '0.00'}% del monto total que recuperás en {deadlineDays} días.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={createReceivable} disabled={isPending}>
            {isPending ? 'Firmando...' : 'Registrar venta por cobrar'}
          </button>
          <button className="ghost" onClick={mintTestUSDC} disabled={isPending}>
            (Demo) Acuñar 2,000,000 MXN de prueba
          </button>
        </div>
      </div>

      <div className="section-title">Mis ventas registradas ({myReceivables.length})</div>
      {myReceivables.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          Aún no has registrado ventas por cobrar.
        </div>
      ) : (
        myReceivables.map(({ id, data }) => {
          if (!data) return null;
          const pct = data.fundingGoal > 0n ? Number((data.fundedAmount * 100n) / data.fundingGoal) : 0;
          const receivedByDealer = (data.fundingGoal * 9950n) / 10000n;
          // Total cost of the operation = what dealer repays minus what they received
          // = faceValue - receivedByDealer  (already includes discount + protocol fee)
          const operationCost = data.faceValue - receivedByDealer;
          const costPct = data.faceValue > 0n
            ? (Number(operationCost) / Number(data.faceValue)) * 100
            : 0;
          // Days remaining to deadline
          const nowSec = BigInt(Math.floor(Date.now() / 1000));
          const secsRemaining = data.settlementDeadline > nowSec
            ? Number(data.settlementDeadline - nowSec)
            : 0;
          const daysRemaining = Math.ceil(secsRemaining / 86400);
          return (
            <div key={String(id)} className="card">
              <div className="receivable-header">
                <div>
                  <div className="receivable-title">Venta #{String(id)}</div>
                  <div className="receivable-ref mono">ref: {data.offchainRef.slice(0, 12)}…</div>
                </div>
                <span className={statusPillClass(data.status)}>{statusLabel(data.status)}</span>
              </div>

              <div className="receivable-meta">
                <div className="meta-item">
                  <div className="meta-label">Monto total</div>
                  <div className="meta-value">${formatMXN(data.faceValue)} MXN</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Adelanto recibido</div>
                  <div className="meta-value">${formatMXN(receivedByDealer)} MXN</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Costo por operación</div>
                  <div className="meta-value" style={{ color: '#ff8a8a' }}>
                    −${formatMXN(operationCost)} MXN
                    <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 4 }}>
                      ({costPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Descuento</div>
                  <div className="meta-value">{(Number(data.discountBps) / 100).toFixed(2)}%</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Plazo de cobro</div>
                  <div className="meta-value">
                    {formatDeadline(data.settlementDeadline)}
                    {data.status !== 4 && data.status !== 5 && data.status !== 6 && (
                      <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 4 }}>
                        ({daysRemaining > 0 ? `${daysRemaining} día${daysRemaining === 1 ? '' : 's'}` : 'vencido'})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {data.status === 1 && (
                <>
                  <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    Fondeado ${formatMXN(data.fundedAmount)} de ${formatMXN(data.fundingGoal)} ({pct}%)
                  </div>
                </>
              )}

              <div className="actions" style={{ marginTop: 14 }}>
                {data.status === 1 && (
                  <button className="ghost" onClick={() => cancel(id)} disabled={isPending}>Cancelar</button>
                )}
                {data.status === 2 && (
                  <button onClick={() => disburse(id)} disabled={isPending}>Recibir adelanto ahora</button>
                )}
                {data.status === 3 && (
                  <button onClick={() => approveAndSettle(id, data.faceValue)} disabled={isPending}>
                    Depositar ${formatMXN(data.faceValue)} MXN (ya cobré del banco)
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {txConfirming && <div style={{ marginTop: 10, fontSize: 13, color: '#ffcc5c' }}>Confirmando transacción…</div>}
    </div>
  );
}
