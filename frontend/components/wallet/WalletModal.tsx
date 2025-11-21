/**
 * WalletModal Component
 * Modal displaying wallet details and actions
 * Supports both ICP (Internet Identity) and Bitcoin (SIWB) authentication
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
  Bitcoin,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDualAuth } from '@/lib/auth';
import { useRegistry } from '@/hooks/useRegistry';
import { useBitcoinIntegration } from '@/hooks/useBitcoinIntegration';
import { getICPLedgerActor, getCyclesLedgerActor } from '@/lib/icp/actors';
import { walletToast } from '@/lib/toast';
import { SendModal } from './SendModal';
import { TransactionHistoryModal } from './TransactionHistoryModal';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDisconnect: () => void;
}

export function WalletModal({ isOpen, onClose, onDisconnect }: WalletModalProps) {
  const { icp, bitcoin, authMethod, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();
  const { getMyRunes } = useRegistry();
  const { getCkBTCBalance } = useBitcoinIntegration();

  const [copied, setCopied] = useState(false);
  const [copiedBtc, setCopiedBtc] = useState(false);
  const [myRunes, setMyRunes] = useState<any[]>([]);
  const [ckBTCBalance, setCkBTCBalance] = useState<bigint>(0n);
  const [icpBalance, setIcpBalance] = useState<bigint>(0n);
  const [cyclesBalance, setCyclesBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

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

      // Get ICP and Cycles balances (async actors)
      const [icpLedger, cyclesLedger] = await Promise.all([
        getICPLedgerActor(),
        getCyclesLedgerActor(),
      ]);

      const [runes, ckbtcBal, icpBal, cyclesBal] = await Promise.all([
        getMyRunes(),
        getCkBTCBalance(principal.toText()),
        icpLedger.icrc1_balance_of({
          owner: principal,
          subaccount: [],
        }).catch(() => 0n),
        cyclesLedger.icrc1_balance_of({
          owner: principal,
          subaccount: [],
        }).catch(() => 0n),
      ]);

      setMyRunes(runes);
      setCkBTCBalance(ckbtcBal || 0n);
      setIcpBalance(icpBal);
      setCyclesBalance(cyclesBal);
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

  const handleCopyBtc = async () => {
    if (bitcoin.address) {
      await navigator.clipboard.writeText(bitcoin.address);
      setCopiedBtc(true);
      setTimeout(() => setCopiedBtc(false), 2000);
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
    <div className="fixed inset-0 bg-black/60 z-50 flex">
      {/* Backdrop - click to close */}
      <div className="flex-1 hidden md:block" onClick={onClose} />

      {/* Fullscreen Panel */}
      <div className="w-full md:w-[600px] lg:w-[700px] h-full bg-gradient-to-br from-museum-white via-museum-cream to-museum-white overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-museum-white/95 backdrop-blur-sm border-b border-museum-light-gray p-6 lg:p-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold-100 rounded-xl">
              <Wallet className="h-7 w-7 text-gold-600" />
            </div>
            <div>
              <h2 className="font-serif text-2xl lg:text-3xl font-bold text-museum-black">My Wallet</h2>
              <p className="text-sm text-museum-dark-gray">QURI Protocol Account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-museum-cream rounded-xl transition-colors"
          >
            <X className="h-6 w-6 text-museum-dark-gray" />
          </button>
        </div>

        <div className="p-6 lg:p-8 space-y-8">
          {/* Auth Method Badge */}
          <div className="flex items-center gap-2 mb-2">
            {authMethod === 'icp' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Internet Identity
              </span>
            )}
            {authMethod === 'bitcoin' && (
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full flex items-center gap-1">
                <Bitcoin className="h-3 w-3" />
                Bitcoin Wallet
              </span>
            )}
            {authMethod === 'dual' && (
              <>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  ICP
                </span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <Bitcoin className="h-3 w-3" />
                  BTC
                </span>
              </>
            )}
          </div>

          {/* Bitcoin Address (if connected) */}
          {bitcoin.address && (
            <div className="bg-museum-white border-2 border-orange-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-museum-black uppercase tracking-wide flex items-center gap-2">
                  <Bitcoin className="h-4 w-4 text-orange-600" />
                  Bitcoin Address
                </span>
                <div className="flex items-center gap-2">
                  {bitcoin.wallet && (
                    <span className="text-xs text-orange-600 font-medium capitalize">{bitcoin.wallet}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-mono text-sm lg:text-base text-museum-black break-all flex-1 bg-orange-50 p-3 rounded-lg">
                  {bitcoin.address}
                </p>
                <button
                  onClick={handleCopyBtc}
                  className="p-3 hover:bg-orange-50 rounded-xl transition-colors flex-shrink-0 border border-orange-200"
                  title="Copy to clipboard"
                >
                  {copiedBtc ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-orange-600" />
                  )}
                </button>
                <a
                  href={`https://mempool.space/address/${bitcoin.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 hover:bg-orange-50 rounded-xl transition-colors flex-shrink-0 border border-orange-200"
                  title="View in Mempool"
                >
                  <ExternalLink className="h-5 w-5 text-orange-600" />
                </a>
              </div>
            </div>
          )}

          {/* Principal ID */}
          <div className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-museum-black uppercase tracking-wide flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                Principal ID
              </span>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600 font-medium">Connected</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-mono text-sm lg:text-base text-museum-black break-all flex-1 bg-museum-cream p-3 rounded-lg">
                {principal?.toText()}
              </p>
              <button
                onClick={handleCopy}
                className="p-3 hover:bg-gold-50 rounded-xl transition-colors flex-shrink-0 border border-museum-light-gray"
                title="Copy to clipboard"
              >
                {copied ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5 text-museum-dark-gray" />
                )}
              </button>
              <a
                href={`https://dashboard.internetcomputer.org/account/${principal?.toText()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 hover:bg-gold-50 rounded-xl transition-colors flex-shrink-0 border border-museum-light-gray"
                title="View in ICP Explorer"
              >
                <ExternalLink className="h-5 w-5 text-museum-dark-gray" />
              </a>
            </div>
          </div>

          {/* Balances */}
          <div>
            <h3 className="font-serif text-xl font-bold text-museum-black mb-4">Balances</h3>
            <div className="space-y-4">
              {/* ICP Balance */}
              <div className="border-2 border-purple-200 rounded-2xl p-6 bg-gradient-to-br from-purple-50 to-purple-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">∞</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-museum-black">ICP</p>
                      <p className="text-sm text-purple-700">Internet Computer</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-2xl lg:text-3xl text-museum-black">
                      {loading ? '...' : formatBalance(icpBalance)}
                    </p>
                    <p className="text-sm text-purple-700">ICP</p>
                  </div>
                </div>
              </div>

              {/* Cycles Balance */}
              <div className="border-2 border-cyan-200 rounded-2xl p-6 bg-gradient-to-br from-cyan-50 to-cyan-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-600 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">⚡</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-museum-black">Cycles</p>
                      <p className="text-sm text-cyan-700">Computation Power</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-2xl lg:text-3xl text-museum-black">
                      {loading ? '...' : (Number(cyclesBalance) / 1_000_000_000_000).toFixed(3)}
                    </p>
                    <p className="text-sm text-cyan-700">TC</p>
                  </div>
                </div>
              </div>

              {/* ckBTC Balance */}
              <div className="border-2 border-orange-200 rounded-2xl p-6 bg-gradient-to-br from-orange-50 to-orange-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">₿</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-museum-black">ckBTC</p>
                      <p className="text-sm text-orange-700">Chain Key Bitcoin</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-2xl lg:text-3xl text-museum-black">
                      {loading ? '...' : formatBalance(ckBTCBalance)}
                    </p>
                    <p className="text-sm text-orange-700">ckBTC</p>
                  </div>
                </div>
              </div>

              {/* Runes Count */}
              <div className="border-2 border-gold-200 rounded-2xl p-6 bg-gradient-to-br from-gold-50 to-gold-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gold-600 flex items-center justify-center shadow-lg">
                      <Wallet className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-museum-black">My Runes</p>
                      <p className="text-sm text-gold-700">Bitcoin Runes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-2xl lg:text-3xl text-museum-black">
                      {loading ? '...' : myRunes.length}
                    </p>
                    <p className="text-sm text-gold-700">Runes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="font-serif text-xl font-bold text-museum-black mb-4">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-6 rounded-xl hover:border-gold-300 hover:bg-gold-50 transition-all"
                onClick={() => {
                  if (principal) {
                    navigator.clipboard.writeText(principal.toText());
                    walletToast.principalCopied();
                  }
                }}
              >
                <Download className="h-6 w-6 mb-3 text-gold-600" />
                <span className="text-sm font-medium">Receive</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-6 rounded-xl hover:border-gold-300 hover:bg-gold-50 transition-all"
                onClick={() => setShowSendModal(true)}
              >
                <Send className="h-6 w-6 mb-3 text-gold-600" />
                <span className="text-sm font-medium">Send</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-6 rounded-xl hover:border-gold-300 hover:bg-gold-50 transition-all"
                onClick={() => setShowHistoryModal(true)}
              >
                <History className="h-6 w-6 mb-3 text-gold-600" />
                <span className="text-sm font-medium">History</span>
              </Button>
            </div>
          </div>

          {/* My Runes List */}
          {myRunes.length > 0 && (
            <div>
              <h3 className="font-serif text-xl font-bold text-museum-black mb-4">My Runes Collection</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {myRunes.map((rune) => (
                  <div
                    key={rune.metadata.key}
                    className="border-2 border-museum-light-gray rounded-xl p-4 hover:border-gold-300 hover:shadow-md transition-all bg-museum-white"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg text-museum-black">
                          {rune.metadata.symbol}
                        </p>
                        <p className="text-sm text-museum-dark-gray">
                          {rune.metadata.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-lg text-museum-black">
                          {formatBalance(
                            rune.metadata.total_supply,
                            Number(rune.metadata.divisibility)
                          )}
                        </p>
                        <p className="text-xs text-museum-dark-gray">Total Supply</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex gap-4 pt-6 border-t-2 border-museum-light-gray">
            <Button
              onClick={() => window.open('https://identity.ic0.app', '_blank')}
              variant="outline"
              size="lg"
              className="flex-1 rounded-xl"
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              Internet Identity
            </Button>
            <Button
              onClick={onDisconnect}
              variant="outline"
              size="lg"
              className="flex-1 rounded-xl text-red-600 hover:bg-red-50 border-red-200"
            >
              Disconnect
            </Button>
          </div>
        </div>
      </div>

      {/* Send Modal */}
      <SendModal
        isOpen={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          loadBalances(); // Reload balances after sending
        }}
        icpBalance={icpBalance}
        cyclesBalance={cyclesBalance}
      />

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        principal={principal}
      />
    </div>
  );
}
