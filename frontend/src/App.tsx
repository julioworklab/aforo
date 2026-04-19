import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { monadTestnet } from 'viem/chains';
import DealerView from './views/DealerView';
import LenderView from './views/LenderView';
import './App.css';

type Tab = 'dealer' | 'lender';

export default function App() {
  const [tab, setTab] = useState<Tab>('dealer');
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== monadTestnet.id;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <img src="/logo.png" alt="Aforo" style={{ width: 64, height: 64, borderRadius: 14 }} />
          <div>
            <div className="brand-name">Aforo</div>
            <div className="brand-tag">Le adelantamos la lana a tu negocio.</div>
          </div>
        </div>
        <div className="header-right">
          {isConnected ? (
            <div className="wallet-chip">
              <span className="mono">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
              <button className="ghost" onClick={() => disconnect()}>Salir</button>
            </div>
          ) : (
            <WalletPicker connectors={connectors} onConnect={(c) => connect({ connector: c })} />
          )}
        </div>
      </header>

      {wrongNetwork && (
        <div className="banner">
          <span>Estás en otra red. Cámbiate a Monad Testnet para continuar.</span>
          <button onClick={() => switchChain({ chainId: monadTestnet.id })}>
            Cambiar a Monad Testnet
          </button>
        </div>
      )}

      <nav className="tabs">
        <button
          className={`tab ${tab === 'dealer' ? 'active' : ''}`}
          onClick={() => setTab('dealer')}
        >
          🏪 Soy negocio (necesito adelantar capital)
        </button>
        <button
          className={`tab ${tab === 'lender' ? 'active' : ''}`}
          onClick={() => setTab('lender')}
        >
          💰 Tengo ahorros (quiero ganar prestando)
        </button>
      </nav>

      <main className="main">
        {!isConnected ? (
          <div className="empty">
            <h2>Conecta tu wallet para entrar</h2>
            <p>Necesitas una wallet conectada a Monad Testnet.</p>
          </div>
        ) : wrongNetwork ? (
          <div className="empty">
            <h2>Red incorrecta</h2>
            <p>Cambia a Monad Testnet desde el banner de arriba.</p>
          </div>
        ) : tab === 'dealer' ? (
          <DealerView />
        ) : (
          <LenderView />
        )}
      </main>

      <footer className="footer">
        <div>
          <span className="muted">Contratos en Monad Testnet:</span>{' '}
          <a
            href="https://testnet.monadexplorer.com/address/0xB895065C8948a52040019B40276C7beB5f112189"
            target="_blank"
            rel="noopener noreferrer"
          >
            Aforo
          </a>{' '}
          ·{' '}
          <a
            href="https://testnet.monadexplorer.com/address/0x22fca50f7d4E9d1aD167E28e70FA8A855C4dD594"
            target="_blank"
            rel="noopener noreferrer"
          >
            mUSDC
          </a>
        </div>
      </footer>
    </div>
  );
}

// Wallet picker: on desktop shows injected providers discovered via EIP-6963.
// On mobile (no extensions) shows deep-link buttons that open the site inside
// each wallet's in-app browser, where window.ethereum IS injected.
function WalletPicker({
  connectors,
  onConnect,
}: {
  connectors: ReturnType<typeof useConnect>['connectors'];
  onConnect: (c: ReturnType<typeof useConnect>['connectors'][number]) => void;
}) {
  const filtered = connectors.filter((c) => !/trust/i.test(c.name) && !/trust/i.test(c.id));

  const isMobile = typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);

  const currentHost = typeof window !== 'undefined' ? window.location.host : '';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const currentFullUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Only MetaMask has a reliable "open this URL in my in-app browser" deep link.
  // Phantom and Zerion don't officially support browsing arbitrary dApps via URL —
  // their mobile UX is WalletConnect-first. For those we fall back to "copy URL"
  // so the user can paste it inside their wallet's built-in browser.
  type WalletEntry = {
    name: string;
    icon: string;
    kind: 'deep-link' | 'copy-url';
    href?: string;
    instruction?: string;
  };
  const deepLinks: WalletEntry[] = [
    {
      name: 'MetaMask',
      kind: 'deep-link',
      href: `https://metamask.app.link/dapp/${currentHost}${currentPath}`,
      icon: '/wallets/metamask.png',
    },
    {
      name: 'Phantom',
      kind: 'copy-url',
      instruction: 'Abre Phantom → tab Browse (🧭) → pega el link',
      icon: '/wallets/phantom.png',
    },
    {
      name: 'Zerion',
      kind: 'copy-url',
      instruction: 'Abre Zerion → tab DApps → Browser → pega el link',
      icon: '/wallets/zerion.png',
    },
  ];

  async function copyAndShow(w: WalletEntry) {
    try {
      await navigator.clipboard.writeText(currentFullUrl);
      alert(`Link copiado.\n\n${w.instruction}`);
    } catch {
      alert(`Copia este link manualmente y pégalo en ${w.name}:\n\n${currentFullUrl}`);
    }
  }

  const buttonStyle = {
    background: 'linear-gradient(135deg, #836EF9, #A0055D)',
    color: 'white',
    padding: '10px 14px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 14,
    textDecoration: 'none',
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 8,
    border: 'none',
    cursor: 'pointer',
  };

  function WalletBtn({ w }: { w: WalletEntry }) {
    const content = (
      <>
        <img src={w.icon} alt="" style={{ width: 18, height: 18, borderRadius: 4 }} />
        {w.name}
      </>
    );
    if (w.kind === 'deep-link' && w.href) {
      return (
        <a
          key={w.name}
          href={w.href}
          target="_blank"
          rel="noopener noreferrer"
          style={buttonStyle}
        >
          {content}
        </a>
      );
    }
    return (
      <button
        key={w.name}
        onClick={() => copyAndShow(w)}
        style={buttonStyle}
      >
        {content}
      </button>
    );
  }

  // On mobile, if no injected provider, show deep-link row.
  if (isMobile && filtered.length === 0) {
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 600 }}>
        {deepLinks.map((w) => <WalletBtn key={w.name} w={w} />)}
      </div>
    );
  }

  // Desktop or wallet-browser: inject provider buttons. If no providers at all
  // on desktop, still fall back to the deep-link row so the user has options.
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 600 }}>
      {filtered.map((c) => (
        <button
          key={c.uid}
          onClick={() => onConnect(c)}
          title={`${c.id} — ${c.type}`}
        >
          {c.icon && (
            <img
              src={c.icon}
              alt=""
              style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6, borderRadius: 3 }}
            />
          )}
          {c.name}
        </button>
      ))}
      {filtered.length === 0 && deepLinks.map((w) => <WalletBtn key={w.name} w={w} />)}
    </div>
  );
}
