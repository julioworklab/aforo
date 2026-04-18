import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts, usePublicClient } from 'wagmi';
import { CONTRACTS } from '../config';
import rmAbi from '../receivable-market-abi.json';
import usdcAbi from '../mock-usdc-abi.json';
import {
  formatMXN, parseMXN, statusPillClass, statusLabel,
  formatDeadline, annualizePct, type Receivable,
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

  const { data: myClaims, refetch: refetchClaims } = useReadContracts({
    contracts: ids.map(id => ({
      address: CONTRACTS.ReceivableMarket,
      abi: rmAbi as any,
      functionName: 'hasClaimed',
      args: address ? [id, address] : [],
    })),
    query: { refetchInterval: 5000, enabled: Boolean(address) },
  });

  // Pull per-position event timestamps (create, fund, claim) so we can compute
  // the REAL capital-deployed window for APY, not a theoretical term.
  const publicClient = usePublicClient();
  const [creationTs, setCreationTs] = useState<Record<string, bigint>>({});
  const [lenderTimings, setLenderTimings] = useState<Record<string, { fund?: bigint; claim?: bigint }>>({});

  useEffect(() => {
    if (!publicClient || total === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 250000n ? currentBlock - 250000n : 0n;
        const [createdLogs, fundedLogs, claimedLogs] = await Promise.all([
          publicClient.getContractEvents({
            address: CONTRACTS.ReceivableMarket,
            abi: rmAbi as any,
            eventName: 'ReceivableListed',
            fromBlock, toBlock: currentBlock,
          }),
          publicClient.getContractEvents({
            address: CONTRACTS.ReceivableMarket,
            abi: rmAbi as any,
            eventName: 'LenderFunded',
            args: address ? { lender: address } : undefined,
            fromBlock, toBlock: currentBlock,
          }),
          publicClient.getContractEvents({
            address: CONTRACTS.ReceivableMarket,
            abi: rmAbi as any,
            eventName: 'LenderClaimed',
            args: address ? { lender: address } : undefined,
            fromBlock, toBlock: currentBlock,
          }),
        ]);

        const allBlocks = new Set<bigint>();
        for (const l of [...createdLogs, ...fundedLogs, ...claimedLogs]) {
          if (l.blockNumber) allBlocks.add(l.blockNumber);
        }
        const tsByBlock: Record<string, bigint> = {};
        await Promise.all(Array.from(allBlocks).map(async bn => {
          const block = await publicClient.getBlock({ blockNumber: bn });
          tsByBlock[String(bn)] = block.timestamp;
        }));

        const created: Record<string, bigint> = {};
        for (const log of createdLogs as any[]) {
          const rid = log.args?.id?.toString();
          if (rid && log.blockNumber) created[rid] = tsByBlock[String(log.blockNumber)] ?? 0n;
        }

        const timings: Record<string, { fund?: bigint; claim?: bigint }> = {};
        for (const log of fundedLogs as any[]) {
          const rid = log.args?.id?.toString();
          if (!rid || !log.blockNumber) continue;
          const ts = tsByBlock[String(log.blockNumber)];
          if (!timings[rid]) timings[rid] = {};
          if (!timings[rid].fund || ts < timings[rid].fund!) timings[rid].fund = ts;
        }
        for (const log of claimedLogs as any[]) {
          const rid = log.args?.id?.toString();
          if (!rid || !log.blockNumber) continue;
          const ts = tsByBlock[String(log.blockNumber)];
          if (!timings[rid]) timings[rid] = {};
          timings[rid].claim = ts;
        }

        if (!cancelled) {
          setCreationTs(created);
          setLenderTimings(timings);
        }
      } catch (e) {
        console.warn('No se pudieron cargar timestamps:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [publicClient, total, address]);

  /** Days of real capital deployment.
   *  - Realized (claimed): fund → claim (actual held window).
   *  - Active (funded but not yet claimed): fund → deadline (expected).
   *  - Fallback to creation→deadline if fund event missing.
   *  Floor at 1 day so the display doesn't go into hours/minutes. */
  function termDaysFor(id: bigint, deadline: bigint, opts: { claimed?: boolean } = {}): number {
    const rid = String(id);
    const t = lenderTimings[rid];
    if (opts.claimed && t?.fund && t?.claim && t.claim > t.fund) {
      return Math.max(1, Number(t.claim - t.fund) / 86400);
    }
    if (t?.fund && deadline > t.fund) {
      return Math.max(1, Number(deadline - t.fund) / 86400);
    }
    const created = creationTs[rid];
    if (created && deadline > created) {
      return Math.max(1, Number(deadline - created) / 86400);
    }
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    if (deadline > nowSec) return Math.max(1, Number(deadline - nowSec) / 86400);
    return 28;
  }

  useEffect(() => {
    if (txDone) {
      refetchCount();
      refetchAll();
      refetchBalance();
      refetchShares();
      refetchClaims();
    }
  }, [txDone, refetchCount, refetchAll, refetchBalance, refetchShares, refetchClaims]);

  const listed = (allReceivables ?? []).map((r, i) => ({
    id: ids[i],
    data: r.result as unknown as Receivable | undefined,
  })).filter(r => r.data && r.data.status === 1);

  const myPositions = (allReceivables ?? []).map((r, i) => ({
    id: ids[i],
    data: r.result as unknown as Receivable | undefined,
    share: (myShares?.[i]?.result as bigint | undefined) ?? 0n,
    claimed: Boolean(myClaims?.[i]?.result),
  })).filter(r => r.data && r.share > 0n);

  // Split positions: active (not yet claimed) vs history (already claimed/realized)
  const activePositions = myPositions.filter(p => !p.claimed);
  const realizedPositions = myPositions.filter(p => p.claimed);

  // Realized PnL across all claimed positions
  const { totalInvested, totalReceived, totalProfit } = realizedPositions.reduce((acc, p) => {
    if (!p.data) return acc;
    const principal = p.share;
    const payout = p.data.status === 4
      ? (p.share * p.data.settledAmount) / p.data.fundingGoal
      : p.data.status === 6
        ? p.share  // cancelled = refund principal, no profit
        : 0n;      // defaulted = no payout
    return {
      totalInvested: acc.totalInvested + principal,
      totalReceived: acc.totalReceived + payout,
      totalProfit: acc.totalProfit + (payout - principal),
    };
  }, { totalInvested: 0n, totalReceived: 0n, totalProfit: 0n });

  const [fundAmounts, setFundAmounts] = useState<Record<string, string>>({});

  async function fund(id: bigint, remaining: bigint) {
    const key = String(id);
    const raw = fundAmounts[key] ?? formatMXN(remaining);
    const amount = parseMXN(raw);

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
      args: [address, parseMXN('2000000')],
    });
    setLastTxHash(hash);
  }

  return (
    <div>
      <div className="grid-2">
        <div className="stat">
          <div className="stat-label">Tu saldo disponible</div>
          <div className="stat-value">${formatMXN(usdcBalance as bigint | undefined)} <span style={{ fontSize: 14, color: '#888', fontWeight: 400 }}>MXN</span></div>
          <button className="ghost" onClick={mintTestUSDC} disabled={isPending} style={{ marginTop: 10, fontSize: 12 }}>
            (Demo) Acuñar 2,000,000 MXN
          </button>
        </div>
        <div className="stat">
          <div className="stat-label">Oportunidades en el mercado</div>
          <div className="stat-value">{listed.length}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>ventas buscando fondeo</div>
        </div>
        <div className="stat">
          <div className="stat-label">Ganancia total ya cobrada</div>
          <div className="stat-value" style={{ color: totalProfit > 0n ? '#86ffc6' : '#ccc' }}>
            {totalProfit > 0n ? '+' : ''}${formatMXN(totalProfit)}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
            {realizedPositions.length} operación(es) cerrada(s) · prestaste ${formatMXN(totalInvested)}, recibiste ${formatMXN(totalReceived)}
          </div>
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
                  <div className="meta-value">${formatMXN(data.faceValue)} MXN</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Prestas hoy (máx)</div>
                  <div className="meta-value">${formatMXN(remaining)} MXN</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Ganancia si fondeas todo</div>
                  <div className="meta-value" style={{ color: '#86ffc6' }}>+${formatMXN(projectedProfit)} MXN</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Vence</div>
                  <div className="meta-value">{formatDeadline(data.settlementDeadline)}</div>
                </div>
              </div>

              <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
              <div style={{ fontSize: 12, color: '#888' }}>
                Fondeado ${formatMXN(data.fundedAmount)} de ${formatMXN(data.fundingGoal)} ({pct}%)
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label>Cuánto prestar (MXN)</label>
                  <input
                    value={fundAmounts[key] ?? formatMXN(remaining, { showDecimals: false })}
                    onChange={e => setFundAmounts(s => ({ ...s, [key]: e.target.value }))}
                    placeholder={formatMXN(remaining, { showDecimals: false })}
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

      {activePositions.length > 0 && (
        <>
          <div className="section-title">Mis posiciones activas</div>
          {activePositions.map(({ id, data, share }) => {
            if (!data) return null;
            const canClaim = data.status === 4 || data.status === 6;
            const projectedPayout = data.status === 4
              ? (share * data.settledAmount) / data.fundingGoal
              : share;
            const projectedProfit = projectedPayout - share;

            return (
              <div key={String(id)} className="card">
                <div className="receivable-header">
                  <div>
                    <div className="receivable-title">Venta #{String(id)}</div>
                    <div className="receivable-ref mono">prestaste ${formatMXN(share)} MXN</div>
                  </div>
                  <span className={statusPillClass(data.status)}>{statusLabel(data.status)}</span>
                </div>

                <div className="receivable-meta">
                  <div className="meta-item">
                    <div className="meta-label">Tu préstamo</div>
                    <div className="meta-value">${formatMXN(share)} MXN</div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">{canClaim ? 'Puedes cobrar' : 'Recibirás al vencer'}</div>
                    <div className="meta-value" style={{ color: canClaim ? '#86ffc6' : '#ccc' }}>
                      ${formatMXN(projectedPayout)} MXN
                    </div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Ganancia</div>
                    <div className="meta-value" style={{ color: '#86ffc6' }}>
                      +${formatMXN(projectedProfit)} MXN
                    </div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Vence</div>
                    <div className="meta-value">{formatDeadline(data.settlementDeadline)}</div>
                  </div>
                </div>

                {canClaim && (
                  <button onClick={() => claim(id)} disabled={isPending}>
                    Cobrar ${formatMXN(projectedPayout)} MXN
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      {realizedPositions.length > 0 && (
        <>
          <div className="section-title">Historial — operaciones cerradas</div>
          {realizedPositions.map(({ id, data, share }) => {
            if (!data) return null;
            const actualPayout = data.status === 4
              ? (share * data.settledAmount) / data.fundingGoal
              : data.status === 6 ? share : 0n;
            const profit = actualPayout - share;
            const effectiveReturn = share > 0n ? Number(profit) / Number(share) : 0;
            const term = termDaysFor(id, data.settlementDeadline, { claimed: true });
            const apy = annualizePct(effectiveReturn, term);

            return (
              <div key={String(id)} className="card" style={{ opacity: 0.95 }}>
                <div className="receivable-header">
                  <div>
                    <div className="receivable-title">Venta #{String(id)} <span style={{ fontSize: 13, color: '#86ffc6', fontWeight: 400 }}>✓ Cobrada</span></div>
                    <div className="receivable-ref mono">prestaste ${formatMXN(share)} · recibiste ${formatMXN(actualPayout)}</div>
                  </div>
                  <span className={statusPillClass(data.status)}>{statusLabel(data.status)}</span>
                </div>

                <div className="receivable-meta">
                  <div className="meta-item">
                    <div className="meta-label">Prestaste</div>
                    <div className="meta-value">${formatMXN(share)} MXN</div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Cobraste</div>
                    <div className="meta-value">${formatMXN(actualPayout)} MXN</div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Ganancia realizada</div>
                    <div className="meta-value" style={{ color: profit > 0n ? '#86ffc6' : '#aaa' }}>
                      {profit > 0n ? '+' : ''}${formatMXN(profit)} MXN
                    </div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">Rendimiento efectivo</div>
                    <div className="meta-value" style={{ color: '#b9a6ff' }}>
                      {(effectiveReturn * 100).toFixed(2)}%
                      <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 4 }}>
                        ({term.toFixed(0)} días)
                      </span>
                    </div>
                  </div>
                  <div className="meta-item">
                    <div className="meta-label">APY anualizado</div>
                    <div className="meta-value" style={{ color: '#86ffc6' }}>
                      {apy.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {activePositions.length === 0 && realizedPositions.length === 0 && (
        <>
          <div className="section-title">Mis posiciones</div>
          <div className="card" style={{ textAlign: 'center', color: '#666' }}>
            Aún no has prestado a ninguna venta.
          </div>
        </>
      )}

      {txConfirming && <div style={{ marginTop: 10, fontSize: 13, color: '#ffcc5c' }}>Confirmando transacción…</div>}
    </div>
  );
}
