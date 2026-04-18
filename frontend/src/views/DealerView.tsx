import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { CONTRACTS } from '../config';
import rmAbi from '../receivable-market-abi.json';
import usdcAbi from '../mock-usdc-abi.json';
import {
  formatUSDC, parseUSDC, statusPillClass, statusLabel,
  offchainRef, daysFromNow, formatDeadline, type Receivable,
} from '../lib';

export default function DealerView() {
  const { address } = useAccount();

  // Form state
  const [dealName, setDealName] = useState('Alan Valadez — Audi Q5');
  const [faceMXN, setFaceMXN] = useState('1080000');
  const [discount, setDiscount] = useState('3');
  const [deadlineDays, setDeadlineDays] = useState('28');

  // Tx state
  const { writeContractAsync, isPending } = useWriteContract();
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: txConfirming, isSuccess: txDone } = useWaitForTransactionReceipt({ hash: lastTxHash });

  // Read total count
  const { data: nextId, refetch: refetchCount } = useReadContract({
    address: CONTRACTS.ReceivableMarket,
    abi: rmAbi,
    functionName: 'nextReceivableId',
    query: { refetchInterval: 5000 },
  });

  // Read all receivables
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

  // Re-fetch after any successful tx
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

  // Actions
  async function createReceivable() {
    const face = parseUSDC(faceMXN);
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
    // Follow-up settle should be a separate click in real UX. For hackathon demo,
    // we do it right after.
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

  // Faucet mUSDC for dealer to test settlement (optional convenience)
  async function mintTestUSDC() {
    const hash = await writeContractAsync({
      address: CONTRACTS.MockUSDC,
      abi: usdcAbi,
      functionName: 'mint',
      args: [address, parseUSDC('2000000')],
    });
    setLastTxHash(hash);
  }

  const faceValue = parseUSDC(faceMXN);
  const discountBps = BigInt(Math.round(parseFloat(discount || '0') * 100));
  const fundingGoal = discountBps > 0n ? (faceValue * (10000n - discountBps)) / 10000n : 0n;

  return (
    <div>
      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>Registrar una nueva venta por cobrar</div>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
          Acabas de vender algo a plazos o con financiamiento del banco. Aquí lo registras para que te adelantemos la lana hoy mismo.
        </p>
        <div className="row">
          <div style={{ flex: 2 }}>
            <label>Nombre de la venta (interno)</label>
            <input value={dealName} onChange={e => setDealName(e.target.value)} placeholder="Ej: Alan Valadez — Audi Q5" />
          </div>
          <div>
            <label>Monto total ($ MXN)</label>
            <input value={faceMXN} onChange={e => setFaceMXN(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <label>Descuento a prestamistas (%)</label>
            <input value={discount} onChange={e => setDiscount(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label>Plazo de cobro (días)</label>
            <input value={deadlineDays} onChange={e => setDeadlineDays(e.target.value)} inputMode="numeric" />
          </div>
        </div>
        <div style={{ marginTop: 14, background: '#0c0c12', border: '1px solid #1f1f2e', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Recibirías aprox. (después del 0.5% de plataforma):</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#86ffc6' }}>
            ${formatUSDC((fundingGoal * 9950n) / 10000n)} <span style={{ fontSize: 14, color: '#888' }}>mUSDC</span>
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>De ${formatUSDC(faceValue)} que te va a pagar el banco en {deadlineDays} días.</div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button onClick={createReceivable} disabled={isPending}>
            {isPending ? 'Firmando...' : 'Registrar venta por cobrar'}
          </button>
          <button className="ghost" onClick={mintTestUSDC} disabled={isPending}>
            (Demo) Acuñar 2M mUSDC para mi wallet
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
                  <div className="meta-value">${formatUSDC(data.faceValue)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Adelanto que recibes</div>
                  <div className="meta-value">${formatUSDC(data.fundingGoal)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Descuento</div>
                  <div className="meta-value">{Number(data.discountBps) / 100}%</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Plazo de cobro</div>
                  <div className="meta-value">{formatDeadline(data.settlementDeadline)}</div>
                </div>
              </div>

              {data.status === 1 && (
                <>
                  <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    Fondeado ${formatUSDC(data.fundedAmount)} de ${formatUSDC(data.fundingGoal)} ({pct}%)
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
                    Depositar ${formatUSDC(data.faceValue)} (ya cobré del banco)
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
