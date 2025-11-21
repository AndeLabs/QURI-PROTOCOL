/**
 * Bitcoin Wallet Selector
 * UI for connecting Bitcoin wallets (UniSat, Xverse, Leather, OKX)
 */

'use client';

import { useState } from 'react';
import { Shield, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useDualAuth } from '@/lib/auth';

export type BitcoinWalletType = 'unisat' | 'xverse' | 'leather' | 'okx' | 'phantom';

interface WalletOption {
  id: BitcoinWalletType;
  name: string;
  icon: string;
  description: string;
  installUrl: string;
}

const WALLETS: WalletOption[] = [
  {
    id: 'xverse',
    name: 'Xverse',
    icon: '/images/wallets/xverse.svg',
    description: 'Popular Bitcoin wallet with Ordinals support',
    installUrl: 'https://www.xverse.app/',
  },
  {
    id: 'unisat',
    name: 'UniSat',
    icon: '/images/wallets/unisat.svg',
    description: 'Leading BRC-20 and Runes wallet',
    installUrl: 'https://unisat.io/',
  },
  {
    id: 'leather',
    name: 'Leather',
    icon: '/images/wallets/leather.svg',
    description: 'Formerly Hiro Wallet, STX & BTC',
    installUrl: 'https://leather.io/',
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '/images/wallets/okx.svg',
    description: 'Multi-chain wallet by OKX',
    installUrl: 'https://www.okx.com/web3',
  },
];

export function BitcoinWalletSelector() {
  const { bitcoin } = useDualAuth();
  const [selectedWallet, setSelectedWallet] = useState<BitcoinWalletType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (walletId: BitcoinWalletType) => {
    setError(null);
    setSelectedWallet(walletId);
    setIsConnecting(true);

    try {
      // Check if wallet is installed
      const isInstalled = await checkWalletInstalled(walletId);

      if (!isInstalled) {
        setError(`${walletId} wallet not detected. Please install it first.`);
        setIsConnecting(false);
        return;
      }

      // Attempt connection via dual auth provider
      // Note: This requires implementing the connect method in useDualAuth
      // For now, we'll show a placeholder
      await new Promise(resolve => setTimeout(resolve, 1500));

      // TODO: Implement actual SIWB connection
      // const success = await bitcoin.connect(walletId);
      // if (!success) {
      //   throw new Error('Connection failed');
      // }

      console.log(`Connected with ${walletId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  // Check if wallet extension is installed
  const checkWalletInstalled = async (walletId: BitcoinWalletType): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    switch (walletId) {
      case 'unisat':
        return !!(window as any).unisat;
      case 'xverse':
        return !!(window as any).XverseProviders;
      case 'leather':
        return !!(window as any).LeatherProvider || !!(window as any).HiroWalletProvider;
      case 'okx':
        return !!(window as any).okxwallet;
      case 'phantom':
        return !!(window as any).phantom?.bitcoin;
      default:
        return false;
    }
  };

  if (bitcoin?.isAuthenticated && bitcoin?.address) {
    return (
      <div className="p-6 bg-museum-cream border border-gold-200 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-100 rounded-full">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-museum-black">Connected with Bitcoin</p>
            <p className="text-xs text-museum-dark-gray">Wallet authenticated</p>
          </div>
        </div>
        <div className="p-3 bg-museum-white rounded border border-museum-light-gray">
          <p className="text-xs text-museum-dark-gray mb-1">Bitcoin Address</p>
          <p className="font-mono text-sm text-museum-black truncate">{bitcoin.address}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gold-50 rounded-lg">
          <Shield className="h-5 w-5 text-gold-600" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-semibold text-museum-black">
            Connect Bitcoin Wallet
          </h3>
          <p className="text-sm text-museum-dark-gray">
            Sign in with your Bitcoin wallet to access all features
          </p>
        </div>
      </div>

      {/* Wallet Options */}
      <div className="grid gap-3">
        {WALLETS.map((wallet) => (
          <button
            key={wallet.id}
            onClick={() => handleConnect(wallet.id)}
            disabled={isConnecting}
            className={`
              group flex items-center gap-4 p-4 rounded-lg border transition-all
              ${selectedWallet === wallet.id && isConnecting
                ? 'border-gold-500 bg-gold-50 shadow-md'
                : 'border-museum-light-gray hover:border-gold-300 hover:bg-museum-cream hover:shadow'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {/* Wallet Icon */}
            <div className="relative w-12 h-12 flex-shrink-0">
              <img
                src={wallet.icon}
                alt={wallet.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to default icon
                  e.currentTarget.src = '/images/wallets/default.svg';
                }}
              />
            </div>

            {/* Wallet Info */}
            <div className="flex-1 text-left">
              <p className="font-semibold text-museum-black group-hover:text-gold-700 transition-colors">
                {wallet.name}
              </p>
              <p className="text-xs text-museum-dark-gray">
                {wallet.description}
              </p>
            </div>

            {/* Status Indicator */}
            <div className="flex-shrink-0">
              {selectedWallet === wallet.id && isConnecting ? (
                <Loader2 className="h-5 w-5 text-gold-600 animate-spin" />
              ) : (
                <ExternalLink className="h-5 w-5 text-museum-dark-gray opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Connection Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            {error.includes('not detected') && selectedWallet && (
              <a
                href={WALLETS.find(w => w.id === selectedWallet)?.installUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-red-700 hover:text-red-900 underline"
              >
                Install {WALLETS.find(w => w.id === selectedWallet)?.name}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900">
          <strong>Note:</strong> For hackathon demo, SIWB is using testnet. Your Bitcoin address
          becomes your identity on QURI Protocol. No private keys are stored.
        </p>
      </div>
    </div>
  );
}
