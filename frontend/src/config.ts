import { http, createConfig } from 'wagmi';
import { monadTestnet } from 'viem/chains';
import { injected } from 'wagmi/connectors';

export const CONTRACTS = {
  ReceivableMarket: '0xB895065C8948a52040019B40276C7beB5f112189' as const,
  MockUSDC: '0x22fca50f7d4E9d1aD167E28e70FA8A855C4dD594' as const,
} as const;

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
