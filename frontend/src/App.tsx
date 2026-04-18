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
          <div className="logo">◈</div>
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
            <button
              onClick={() => {
                const c = connectors[0];
                if (c) connect({ connector: c });
              }}
            >
              Conectar wallet
            </button>
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
          🏪 Soy negocio (necesito mi lana hoy)
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
