/**
 * ConnectWalletModal Component
 * Modal for selecting authentication method (ICP or Bitcoin)
 * Supports Sign-in with Bitcoin (SIWB) for hackathon demo
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Shield, Loader2, CheckCircle, AlertCircle, ExternalLink, Info } from 'lucide-react';
import { useDualAuth, getInstalledWallets, getWalletInfo, getAllWalletConfigs, BitcoinWalletType } from '@/lib/auth';
import { toast } from 'sonner';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to get wallet download URLs
function getWalletUrl(wallet: BitcoinWalletType): string {
  const urls: Record<BitcoinWalletType, string> = {
    xverse: 'https://www.xverse.app/',
    unisat: 'https://unisat.io/',
    leather: 'https://leather.io/',
    okx: 'https://www.okx.com/web3',
    phantom: 'https://phantom.app/',
  };
  return urls[wallet] || '#';
}

// Bitcoin icon component since lucide doesn't have it
const BitcoinIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z" />
    <path
      fill="#FFF"
      d="M17.29 10.288c.256-1.702-.978-2.62-2.643-3.229l.54-2.168-1.318-.328-.527 2.11c-.346-.086-.702-.167-1.056-.248l.53-2.126-1.317-.329-.54 2.167c-.287-.066-.57-.13-.843-.198l.002-.007-1.817-.454-.35 1.407s.978.224.958.238c.534.133.63.488.614.769l-.615 2.47c.037.009.085.023.137.045l-.14-.035-.863 3.461c-.065.162-.23.406-.603.314.014.02-.958-.239-.958-.239l-.654 1.508 1.715.428c.319.08.631.163.94.242l-.546 2.19 1.316.328.54-2.17c.36.098.71.188 1.05.274l-.538 2.155 1.317.328.546-2.185c2.245.425 3.932.254 4.64-1.778.571-1.635-.029-2.578-1.209-3.194.86-.199 1.508-.766 1.68-1.938zm-3.01 4.22c-.405 1.634-3.148.75-4.037.53l.72-2.888c.89.222 3.74.662 3.317 2.358zm.406-4.243c-.37 1.486-2.655.732-3.396.546l.653-2.62c.74.185 3.128.53 2.743 2.074z"
    />
  </svg>
);

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { connectICP, connectBitcoin, isLoading } = useDualAuth();
  const [selectedMethod, setSelectedMethod] = useState<'icp' | 'bitcoin' | null>(null);
  const [loadingMethod, setLoadingMethod] = useState<'icp' | 'bitcoin' | null>(null);
  const [connectingWallet, setConnectingWallet] = useState<BitcoinWalletType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get installed Bitcoin wallets
  const installedWallets = getInstalledWallets();
  const allWallets = getAllWalletConfigs();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMethod(null);
      setError(null);
      setConnectingWallet(null);
    }
  }, [isOpen]);

  const handleICPConnect = async () => {
    setLoadingMethod('icp');
    setError(null);
    try {
      const success = await connectICP();
      if (success) {
        toast.success('Connected with Internet Identity', {
          description: 'You can now access all QURI Protocol features',
        });
        onClose();
      } else {
        setError('Connection failed. Please try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      toast.error('Connection failed', { description: message });
    } finally {
      setLoadingMethod(null);
    }
  };

  const handleBitcoinConnect = async (wallet: BitcoinWalletType) => {
    setLoadingMethod('bitcoin');
    setConnectingWallet(wallet);
    setError(null);
    try {
      const success = await connectBitcoin(wallet);
      if (success) {
        toast.success(`Connected with ${getWalletInfo(wallet).displayName}`, {
          description: 'Sign-in with Bitcoin successful',
        });
        onClose();
      } else {
        setError('Connection failed. Make sure the wallet is unlocked.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      toast.error('Connection failed', { description: message });
    } finally {
      setLoadingMethod(null);
      setConnectingWallet(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-museum-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-museum-light-gray flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-museum-black">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-museum-cream rounded-xl transition-colors"
          >
            <X className="h-5 w-5 text-museum-dark-gray" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!selectedMethod && (
            <>
              <p className="text-sm text-museum-dark-gray mb-4">
                Choose how you want to connect to QURI Protocol
              </p>

              {/* ICP Option */}
              <button
                onClick={() => handleICPConnect()}
                disabled={loadingMethod !== null}
                className="w-full p-4 border-2 border-museum-light-gray rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all flex items-center gap-4 text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  {loadingMethod === 'icp' ? (
                    <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
                  ) : (
                    <Shield className="h-6 w-6 text-purple-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-museum-black">Internet Identity</p>
                  <p className="text-sm text-museum-dark-gray">Secure ICP authentication</p>
                </div>
                {loadingMethod === 'icp' && (
                  <span className="text-xs text-purple-600">Connecting...</span>
                )}
              </button>

              {/* Bitcoin Option */}
              <button
                onClick={() => setSelectedMethod('bitcoin')}
                disabled={loadingMethod !== null}
                className="w-full p-4 border-2 border-museum-light-gray rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all flex items-center gap-4 text-left disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <BitcoinIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-museum-black">Bitcoin Wallet</p>
                  <p className="text-sm text-museum-dark-gray">Sign in with Bitcoin (SIWB)</p>
                </div>
                {installedWallets.length > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    {installedWallets.length} detected
                  </span>
                )}
              </button>

              {/* Info about dual auth */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  You can connect both ICP and Bitcoin for enhanced functionality.
                  Bitcoin wallet connection enables native Runes operations.
                </p>
              </div>
            </>
          )}

          {/* Bitcoin Wallet Selection */}
          {selectedMethod === 'bitcoin' && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => {
                    setSelectedMethod(null);
                    setError(null);
                  }}
                  className="text-sm text-museum-dark-gray hover:text-museum-black flex items-center gap-1"
                >
                  ← Back to options
                </button>
              </div>

              <p className="text-sm text-museum-dark-gray mb-4">
                Select your Bitcoin wallet to sign in
              </p>

              {/* All Wallets - Show installed first, then others */}
              <div className="space-y-2">
                {/* Installed Wallets */}
                {installedWallets.length > 0 && (
                  <>
                    <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-2">
                      Detected Wallets
                    </p>
                    {installedWallets.map((wallet) => {
                      const info = getWalletInfo(wallet);
                      const isConnecting = connectingWallet === wallet;
                      return (
                        <button
                          key={wallet}
                          onClick={() => handleBitcoinConnect(wallet)}
                          disabled={loadingMethod !== null}
                          className={`w-full p-4 border-2 rounded-xl transition-all flex items-center gap-4 text-left disabled:cursor-not-allowed ${
                            isConnecting
                              ? 'border-orange-400 bg-orange-50'
                              : 'border-green-200 hover:border-orange-300 hover:bg-orange-50'
                          }`}
                        >
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            {isConnecting ? (
                              <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />
                            ) : (
                              <BitcoinIcon className="h-5 w-5 text-orange-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-museum-black">{info.displayName}</p>
                            <p className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Ready to connect
                            </p>
                          </div>
                          {isConnecting && (
                            <span className="text-xs text-orange-600">Connecting...</span>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Not Installed Wallets */}
                {installedWallets.length < Object.keys(allWallets).length && (
                  <>
                    <p className="text-xs text-museum-dark-gray font-medium uppercase tracking-wide mb-2 mt-4">
                      {installedWallets.length > 0 ? 'Other Wallets' : 'Available Wallets'}
                    </p>
                    {(Object.keys(allWallets) as BitcoinWalletType[])
                      .filter((w) => !installedWallets.includes(w))
                      .map((wallet) => {
                        const info = allWallets[wallet];
                        return (
                          <div
                            key={wallet}
                            className="w-full p-4 border-2 border-museum-light-gray rounded-xl flex items-center gap-4 text-left opacity-60"
                          >
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <BitcoinIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-museum-black">{info.displayName}</p>
                              <p className="text-xs text-museum-dark-gray">Not installed</p>
                            </div>
                            <a
                              href={getWalletUrl(wallet)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-museum-cream rounded-lg transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4 text-museum-dark-gray" />
                            </a>
                          </div>
                        );
                      })}
                  </>
                )}
              </div>

              {/* No wallets at all */}
              {installedWallets.length === 0 && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-700 font-medium mb-2">
                    No Bitcoin wallet detected
                  </p>
                  <p className="text-xs text-orange-600">
                    Install one of the wallets above to sign in with Bitcoin.
                    We recommend <strong>Xverse</strong> or <strong>UniSat</strong> for the best experience.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-museum-light-gray bg-museum-cream/50">
          <p className="text-xs text-center text-museum-dark-gray">
            By connecting, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
