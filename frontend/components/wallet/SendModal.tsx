/**
 * SendModal Component
 * Modal for sending ICP and Cycles tokens
 */

'use client';

import { useState } from 'react';
import { X, Send, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Principal } from '@dfinity/principal';
import { getICPLedgerActor, getCyclesLedgerActor } from '@/lib/icp/actors';
import { walletToast } from '@/lib/toast';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  icpBalance: bigint;
  cyclesBalance: bigint;
}

type TokenType = 'ICP' | 'CYCLES';

export function SendModal({ isOpen, onClose, icpBalance, cyclesBalance }: SendModalProps) {
  const [tokenType, setTokenType] = useState<TokenType>('ICP');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSend = async () => {
    setError('');

    // Validate recipient
    if (!recipient.trim()) {
      setError('Please enter a recipient principal');
      return;
    }

    let recipientPrincipal: Principal;
    try {
      recipientPrincipal = Principal.fromText(recipient.trim());
    } catch (e) {
      setError('Invalid principal ID format');
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Convert amount to base units (ICP = e8s, Cycles = e12s)
    const amountBaseUnits = tokenType === 'ICP'
      ? BigInt(Math.floor(amountNum * 100_000_000))      // 8 decimals for ICP
      : BigInt(Math.floor(amountNum * 1_000_000_000_000)); // 12 decimals for Cycles

    console.log('[SendModal] Sending:', {
      tokenType,
      inputAmount: amount,
      parsedAmount: amountNum,
      amountBaseUnits: amountBaseUnits.toString(),
      balance: (tokenType === 'ICP' ? icpBalance : cyclesBalance).toString(),
    });

    // Check balance
    const balance = tokenType === 'ICP' ? icpBalance : cyclesBalance;
    if (amountBaseUnits > balance) {
      walletToast.insufficientBalance(tokenType);
      setError(`Insufficient ${tokenType} balance`);
      return;
    }

    try {
      setIsSending(true);

      if (tokenType === 'ICP') {
        // Send ICP
        const ledger = await getICPLedgerActor();
        const result = await ledger.icrc1_transfer({
          to: {
            owner: recipientPrincipal,
            subaccount: [],
          },
          amount: amountBaseUnits,
          fee: [],
          memo: [],
          from_subaccount: [],
          created_at_time: [],
        });

        if ('Ok' in result) {
          walletToast.icpSent(amountBaseUnits, recipient);
          // Reset form
          setRecipient('');
          setAmount('');
          setTimeout(() => onClose(), 2000);
        } else {
          throw new Error('Err' in result ? String(result.Err) : 'Transfer failed');
        }
      } else {
        // Send Cycles
        const ledger = await getCyclesLedgerActor();
        const result = await ledger.icrc1_transfer({
          to: {
            owner: recipientPrincipal,
            subaccount: [],
          },
          amount: amountBaseUnits,
          fee: [],
          memo: [],
          from_subaccount: [],
          created_at_time: [],
        });

        if ('Ok' in result) {
          walletToast.cyclesSent(amountBaseUnits, recipient);
          // Reset form
          setRecipient('');
          setAmount('');
          setTimeout(() => onClose(), 2000);
        } else {
          throw new Error('Err' in result ? String(result.Err) : 'Transfer failed');
        }
      }
    } catch (err) {
      console.error('Send error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to send transaction';
      walletToast.sendFailed(errorMsg);
      setError(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  const formatBalance = (balance: bigint, token: string) => {
    if (token === 'ICP') {
      const value = Number(balance) / 100_000_000;
      return `${value.toFixed(4)} ${token}`;
    } else {
      const value = Number(balance) / 1_000_000_000_000;
      return `${value.toFixed(3)} ${token}`;
    }
  };

  const setMaxAmount = () => {
    const balance = tokenType === 'ICP' ? icpBalance : cyclesBalance;

    if (tokenType === 'ICP') {
      const fee = 0.0001; // ICP fee
      const maxAmount = Math.max(0, Number(balance) / 100_000_000 - fee);
      setAmount(maxAmount.toFixed(8));
    } else {
      const fee = 0.0001; // Cycles fee in TC
      const maxAmount = Math.max(0, Number(balance) / 1_000_000_000_000 - fee);
      setAmount(maxAmount.toFixed(4));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-museum-white rounded-3xl shadow-2xl max-w-md w-full border-2 border-museum-light-gray">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-museum-light-gray">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold-100 rounded-xl">
              <Send className="h-6 w-6 text-gold-600" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-museum-black">Send Tokens</h2>
              <p className="text-sm text-museum-dark-gray">Transfer ICP or Cycles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-museum-cream rounded-xl transition-colors"
            disabled={isSending}
          >
            <X className="h-6 w-6 text-museum-dark-gray" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Token Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-museum-black mb-3 uppercase tracking-wide">
              Select Token
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTokenType('ICP')}
                disabled={isSending}
                className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                  tokenType === 'ICP'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-museum-light-gray hover:border-purple-200 text-museum-dark-gray'
                }`}
              >
                <div className="text-center">
                  <p className="text-lg">ICP</p>
                  <p className="text-xs mt-1">{formatBalance(icpBalance, 'ICP')}</p>
                </div>
              </button>
              <button
                onClick={() => setTokenType('CYCLES')}
                disabled={isSending}
                className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                  tokenType === 'CYCLES'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-museum-light-gray hover:border-blue-200 text-museum-dark-gray'
                }`}
              >
                <div className="text-center">
                  <p className="text-lg">CYCLES</p>
                  <p className="text-xs mt-1">{formatBalance(cyclesBalance, 'TC')}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-semibold text-museum-black mb-2 uppercase tracking-wide">
              Recipient Principal ID
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={isSending}
              placeholder="Enter principal ID (e.g., aaaaa-aa...)"
              className="w-full px-4 py-3 border-2 border-museum-light-gray rounded-xl focus:border-gold-500 focus:ring-2 focus:ring-gold-200 transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-museum-black uppercase tracking-wide">
                Amount
              </label>
              <button
                onClick={setMaxAmount}
                disabled={isSending}
                className="text-xs font-medium text-gold-600 hover:text-gold-700 transition-colors disabled:opacity-50"
              >
                MAX
              </button>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSending}
              placeholder="0.0000"
              step="0.0001"
              min="0"
              className="w-full px-4 py-3 border-2 border-museum-light-gray rounded-xl focus:border-gold-500 focus:ring-2 focus:ring-gold-200 transition-all font-mono text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-museum-dark-gray mt-2">
              Available: {formatBalance(tokenType === 'ICP' ? icpBalance : cyclesBalance, tokenType)}
            </p>
          </div>

          {/* Fee Info */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Transaction Fee</p>
                <p className="text-xs text-blue-700">
                  {tokenType === 'ICP' ? 'Standard ICP transfer fee: 0.0001 ICP' : 'Cycles transfer fee: ~0.0001 TC'}
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSending}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !recipient || !amount}
              className="flex-1 rounded-xl bg-gold-500 hover:bg-gold-600 text-white disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send {tokenType}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
