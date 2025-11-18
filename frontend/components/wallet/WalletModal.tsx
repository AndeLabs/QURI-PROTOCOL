/**
 * WalletModal Component
 * Modal displaying wallet details and actions
 */

'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Copy,
  ExternalLink,
  Wallet,
  Send,
  Download,
  History,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useICP } from '@/lib/icp/ICPProvider';
import { useRegistry } from '@/hooks/useRegistry';
import { useBitcoinIntegration } from '@/hooks/useBitcoinIntegration';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDisconnect: () => void;
}

export function WalletModal({ isOpen, onClose, onDisconnect }: WalletModalProps) {
  const { principal } = useICP();
  const { getMyRunes } = useRegistry();
  const { getCkBTCBalance } = useBitcoinIntegration();

  const [copied, setCopied] = useState(false);
  const [myRunes, setMyRunes] = useState<any[]>([]);
  const [ckBTCBalance, setCkBTCBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);

  // Load balances
  useEffect(() => {
    if (isOpen && principal) {
      loadBalances();
    }
  }, [isOpen, principal]);

  const loadBalances = async () => {
    try {
      setLoading(true);
      if (!principal) return;

      const [runes, balance] = await Promise.all([
        getMyRunes(),
        getCkBTCBalance(principal.toText()),
      ]);
      setMyRunes(runes);
      setCkBTCBalance(balance || 0n);
    } catch (error) {
      console.error('Failed to load balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (principal) {
      await navigator.clipboard.writeText(principal.toText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBalance = (balance: bigint, decimals: number = 8): string => {
    const value = Number(balance) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-museum-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-museum-white border-b border-museum-light-gray p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="h-6 w-6 text-gold-600" />
            <h2 className="font-serif text-2xl font-bold text-museum-black">My Wallet</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-museum-cream rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-museum-dark-gray" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Principal ID */}
          <div className="border border-museum-light-gray rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-museum-dark-gray">Principal ID</span>
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm text-museum-black break-all flex-1">
                {principal?.toText()}
              </p>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-museum-cream rounded-lg transition-colors flex-shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-museum-dark-gray" />
                )}
              </button>
            </div>
          </div>

          {/* Balances */}
          <div>
            <h3 className="font-semibold text-museum-black mb-3">Balances</h3>
            <div className="space-y-3">
              {/* ckBTC Balance */}
              <div className="border border-museum-light-gray rounded-xl p-4 bg-gradient-to-br from-orange-50 to-orange-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">₿</span>
                    </div>
                    <div>
                      <p className="font-semibold text-museum-black">ckBTC</p>
                      <p className="text-xs text-museum-dark-gray">Chain Key Bitcoin</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-lg text-museum-black">
                      {loading ? '...' : formatBalance(ckBTCBalance)}
                    </p>
                    <p className="text-xs text-museum-dark-gray">ckBTC</p>
                  </div>
                </div>
              </div>

              {/* Runes Count */}
              <div className="border border-museum-light-gray rounded-xl p-4 bg-gradient-to-br from-gold-50 to-gold-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-600 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-museum-black">My Runes</p>
                      <p className="text-xs text-museum-dark-gray">Bitcoin Runes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-lg text-museum-black">
                      {loading ? '...' : myRunes.length}
                    </p>
                    <p className="text-xs text-museum-dark-gray">Runes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" size="sm" className="flex-col h-auto py-4">
              <Send className="h-5 w-5 mb-2" />
              <span className="text-xs">Send</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-col h-auto py-4">
              <Download className="h-5 w-5 mb-2" />
              <span className="text-xs">Receive</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-col h-auto py-4">
              <History className="h-5 w-5 mb-2" />
              <span className="text-xs">History</span>
            </Button>
          </div>

          {/* My Runes List */}
          {myRunes.length > 0 && (
            <div>
              <h3 className="font-semibold text-museum-black mb-3">My Runes</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {myRunes.map((rune) => (
                  <div
                    key={rune.metadata.key}
                    className="border border-museum-light-gray rounded-lg p-3 hover:border-gold-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-museum-black">
                          {rune.metadata.symbol}
                        </p>
                        <p className="text-xs text-museum-dark-gray">
                          {rune.metadata.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm text-museum-black">
                          {formatBalance(
                            rune.metadata.total_supply,
                            Number(rune.metadata.divisibility)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-museum-light-gray">
            <Button
              onClick={() => window.open('https://identity.ic0.app', '_blank')}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Internet Identity
            </Button>
            <Button
              onClick={onDisconnect}
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 hover:bg-red-50"
            >
              Disconnect
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
