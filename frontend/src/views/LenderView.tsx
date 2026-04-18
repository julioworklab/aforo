import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { CONTRACTS } from '../config';
import rmAbi from '../receivable-market-abi.json';
import usdcAbi from '../mock-usdc-abi.json';
import {
  formatUSDC, parseUSDC, statusPillClass, statusLabel,
  formatDeadline, type Receivable,
} from '../lib';

export default function LenderView() {
  const { address } = useAccount();

  const { writeContractAsync, isPending } = useWriteContract();
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: txConfirming, isSuccess: txDone } = useWaitForTransactionReceipt({ hash: lastTxHash });

  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.MockUSDC,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { refetchInterval: 5000, enabled: Boolean(address) },
  });

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

  const { data: myShares, refetch: refetchShares } = useReadContracts({
    contracts: ids.map(id => ({
      address: CONTRACTS.ReceivableMarket,
      abi: rmAbi as any,
      functionName: 'lenderShare',
      args: address ? [id, address] : [],
    })),
    query: { refetchInterval: 5000, enabled: Boolean(address) },
  });

  useEffect(() => {
    if (txDone) {
      refetchCount();
      refetchAll();
      refetchBalance();
      refetchShares();
    }
  }, [txDone, refetchCount, refetchAll, refetchBalance, refetchShares]);

  const listed = (allReceivables ?? []).map((r, i) => ({
    id: ids[i],
    data: r.result as unknown as Receivable | undefined,
  })).filter(r => r.data && r.data.status === 1);

  const myPositions = (allReceivables ?? []).map((r, i) => ({
    id: ids[i],
    data: r.result as unknown as Receivable | undefined,
    share: (myShares?.[i]?.result as bigint | undefined) ?? 0n,
  })).filter(r => r.data && r.share > 0n);

  const [fundAmounts, setFundAmounts] = useState<Record<string, string>>({});

  async function fund(id: bigint, remaining: bigint) {
    const key = String(id);
    const raw = fundAmounts[key] ?? formatUSDC(remaining);
    const amount = parseUSDC(raw);

    const approveHash = await writeContractAsync({
      address: CONTRACTS.MockUSDC,
      abi: usdcAbi,
      functionName: 'approve',
      args: [CONTRACTS.ReceivableMarket, amount],
    });
    setLastTxHash(approveHash);
    setTimeout(async () => {
      const fundHash = await writeContractAsync({
        address: CONTRACTS.ReceivableMarket,
        abi: rmAbi,
        functionName: 'fundReceivable',
        args: [id, amount],
      });
      setLastTxHash(fundHash);
    }, 3000);
  }

  async function claim(id: bigint) {
    const hash = await writeContractAsync({
      address: CONTRACTS.ReceivableMarket,
      abi: rmAbi,
      functionName: 'claim',
      args: [id],
    });
    setLastTxHash(hash);
  }

  async function mintTestUSDC() {
    const hash = await writeContractAsync({
      address: CONTRACTS.MockUSDC,
      abi: usdcAbi,
      functionName: 'mint',
      args: [address, parseUSDC('2000000')],
    });
    setLastTxHash(hash);
  }

  return (
    <div>
      <div className="grid-2">
        <div className="stat">
          <div className="stat-label">Tu saldo disponible</div>
          <div className="stat-value">${formatUSDC(usdcBalance as bigint | undefined)} <span style={{ fontSize: 14, color: '#888' }}>mUSDC</span></div>
          <button className="ghost" onClick={mintTestUSDC} disabled={isPending} style={{ marginTop: 10, fontSize: 12 }}>
            (Demo) Acuñar 2M mUSDC
          </button>
        </div>
        <div className="stat">
          <div className="stat-label">Oportunidades en el mercado</div>
          <div className="stat-value">{listed.length}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>ventas por cobrar buscando fondeo</div>
        </div>
        <div className="stat">
          <div className="stat-label">Mis posiciones activas</div>
          <div className="stat-value">{myPositions.length}</div>
        </div>
      </div>

      <div className="section-title">Mercado — ventas buscando fondeo</div>
      {listed.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          No hay ventas esperando fondeo en este momento.
        </div>
      ) : (
        listed.map(({ id, data }) => {
          if (!data) return null;
          const remaining = data.fundingGoal - data.fundedAmount;
          const pct = data.fundingGoal > 0n ? Number((data.fundedAmount * 100n) / data.fundingGoal) : 0;
          const key = String(id);

          // Projected yield for funding the remaining amount
          const projectedPayout = (remaining * data.faceValue) / data.fundingGoal;
          const projectedProfit = projectedPayout - remaining;

          return (
            <div key={key} className="card">
              <div className="receivable-header">
                <div>
                  <div className="receivable-title">Venta #{String(id)}</div>
                  <div className="receivable-ref mono">negocio: {data.dealer.slice(0, 8)}…{data.dealer.slice(-4)}</div>
                </div>
                <span className={statusPillClass(data.status)}>{statusLabel(data.status)}</span>
              </div>

              <div className="receivable-meta">
                <div className="meta-item">
                  <div className="meta-label">Recuperas al vencimiento</div>
                  <div className="meta-value">${formatUSDC(data.faceValue)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Prestas hoy (máx)</div>
                  <div className="meta-value">${formatUSDC(remaining)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Ganancia si fondeas todo</div>
                  <div className="meta-value" style={{ color: '#86ffc6' }}>+${formatUSDC(projectedProfit)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Vence</div>
                  <div className="meta-value">{formatDeadline(data.settlementDeadline)}</div>
                </div>
              </div>

              <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
              <div style={{ fontSize: 12, color: '#888' }}>
                Fondeado ${formatUSDC(data.fundedAmount)} de ${formatUSDC(data.fundingGoal)} ({pct}%)
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label>Cuánto prestar</label>
                  <input
                    value={fundAmounts[key] ?? formatUSDC(remaining)}
                    onChange={e => setFundAmounts(s => ({ ...s, [key]: e.target.value }))}
                    placeholder={formatUSDC(remaining)}
                  />
                </div>
                <button onClick={() => fund(id, remaining)} disabled={isPending}>
                  Prestar
                </button>
              </div>
            </div>
          );
        })
      )}

      <div className="section-title">Mis posiciones</div>
      {myPositions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          Aún no has prestado a ninguna venta.
        </div>
      ) : (
        myPositions.map(({ id, data, share }) => {
          if (!data) return null;
          const canClaim = data.status === 4 || data.status === 6;
          const projectedPayout = data.status === 4
            ? (share * data.settledAmount) / data.fundingGoal
            : share; // refund on cancel

          return (
            <div key={String(id)} className="card">
              <div className="receivable-header">
                <div>
                  <div className="receivable-title">Venta #{String(id)}</div>
                  <div className="receivable-ref mono">prestaste ${formatUSDC(share)}</div>
                </div>
                <span className={statusPillClass(data.status)}>{statusLabel(data.status)}</span>
              </div>

              <div className="receivable-meta">
                <div className="meta-item">
                  <div className="meta-label">Tu préstamo</div>
                  <div className="meta-value">${formatUSDC(share)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Recibirás</div>
                  <div className="meta-value" style={{ color: canClaim ? '#86ffc6' : '#ccc' }}>
                    ${formatUSDC(projectedPayout)}
                  </div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Vence</div>
                  <div className="meta-value">{formatDeadline(data.settlementDeadline)}</div>
                </div>
              </div>

              {canClaim && (
                <button onClick={() => claim(id)} disabled={isPending}>
                  Cobrar ${formatUSDC(projectedPayout)}
                </button>
              )}
            </div>
          );
        })
      )}

      {txConfirming && <div style={{ marginTop: 10, fontSize: 13, color: '#ffcc5c' }}>Confirmando transacción…</div>}
    </div>
  );
}
