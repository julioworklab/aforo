import { http, createConfig } from 'wagmi';
import { monadTestnet } from 'viem/chains';
import { walletConnect } from 'wagmi/connectors';

export const CONTRACTS = {
  ReceivableMarket: '0xB895065C8948a52040019B40276C7beB5f112189' as const,
  MockUSDC: '0x22fca50f7d4E9d1aD167E28e70FA8A855C4dD594' as const,
} as const;

const WC_PROJECT_ID = 'ac265c9347385abefd9ab4e165b0c868';

// EIP-6963 auto-discovers installed browser extensions (MetaMask, Zerion,
// Phantom, Rainbow, etc.). WalletConnect v2 handles mobile wallets and any
// wallet that doesn't inject a provider — pairing via QR on desktop or
// deep link on mobile.
export const config = createConfig({
  chains: [monadTestnet],
  multiInjectedProviderDiscovery: true,
  connectors: [
    walletConnect({
      projectId: WC_PROJECT_ID,
      metadata: {
        name: 'Aforo',
        description: 'Le adelantamos la lana a tu negocio.',
        url: 'https://aforo-monad-julios-projects-33d28a72.vercel.app',
        icons: ['https://aforo-monad-julios-projects-33d28a72.vercel.app/favicon.svg'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
