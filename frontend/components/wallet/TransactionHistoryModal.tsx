/**
 * TransactionHistoryModal Component
 * Displays transaction history for ICP and Cycles
 */

'use client';

import { useState, useEffect } from 'react';
import { X, History, ExternalLink, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Principal } from '@dfinity/principal';
import { getICPLedgerActor, getCyclesLedgerActor } from '@/lib/icp/actors';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  principal: Principal | null;
}

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  token: 'ICP' | 'CYCLES';
  amount: bigint;
  from: string;
  to: string;
  timestamp: bigint;
  memo?: Uint8Array;
}

export function TransactionHistoryModal({ isOpen, onClose, principal }: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ICP' | 'CYCLES'>('all');

  useEffect(() => {
    if (isOpen && principal) {
      loadTransactions();
    }
  }, [isOpen, principal]);

  const loadTransactions = async () => {
    if (!principal) return;

    try {
      setIsLoading(true);

      // Load ICP transactions
      const icpLedger = await getICPLedgerActor();
      const icpAccount = {
        owner: principal,
        subaccount: [],
      };

      // Get recent ICP transactions
      const icpTxs = await icpLedger.get_transactions({
        start: BigInt(0),
        length: BigInt(50),
      });

      const parsedIcpTxs: Transaction[] = [];

      if ('Ok' in icpTxs) {
        const txs = icpTxs.Ok;

        for (const tx of txs.transactions) {
          if ('transfer' in tx.transaction) {
            const transfer = tx.transaction.transfer;
            const isSender = transfer.from.owner.toText() === principal.toText();

            parsedIcpTxs.push({
              id: tx.id.toString(),
              type: isSender ? 'send' : 'receive',
              token: 'ICP',
              amount: transfer.amount,
              from: transfer.from.owner.toText(),
              to: transfer.to.owner.toText(),
              timestamp: tx.timestamp,
              memo: transfer.memo.length > 0 ? transfer.memo[0] : undefined,
            });
          }
        }
      }

      // Load Cycles transactions
      const cyclesLedger = await getCyclesLedgerActor();
      const cyclesTxs = await cyclesLedger.get_transactions({
        start: BigInt(0),
        length: BigInt(50),
      });

      const parsedCyclesTxs: Transaction[] = [];

      if ('Ok' in cyclesTxs) {
        const txs = cyclesTxs.Ok;

        for (const tx of txs.transactions) {
          if ('transfer' in tx.transaction) {
            const transfer = tx.transaction.transfer;
            const isSender = transfer.from.owner.toText() === principal.toText();

            parsedCyclesTxs.push({
              id: tx.id.toString(),
              type: isSender ? 'send' : 'receive',
              token: 'CYCLES',
              amount: transfer.amount,
              from: transfer.from.owner.toText(),
              to: transfer.to.owner.toText(),
              timestamp: tx.timestamp,
              memo: transfer.memo.length > 0 ? transfer.memo[0] : undefined,
            });
          }
        }
      }

      // Combine and sort by timestamp
      const allTxs = [...parsedIcpTxs, ...parsedCyclesTxs].sort(
        (a, b) => Number(b.timestamp - a.timestamp)
      );

      setTransactions(allTxs);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      // Show empty state on error
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredTransactions = transactions.filter(tx =>
    filter === 'all' || tx.token === filter
  );

  const formatAmount = (amount: bigint, token: string) => {
    if (token === 'ICP') {
      const value = Number(amount) / 100_000_000;
      return `${value.toFixed(4)} ICP`;
    } else {
      const value = Number(amount) / 1_000_000_000_000;
      return `${value.toFixed(3)} TC`;
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000); // Convert nanoseconds to milliseconds
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-museum-white rounded-3xl shadow-2xl max-w-2xl w-full border-2 border-museum-light-gray max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-museum-light-gray">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold-100 rounded-xl">
              <History className="h-6 w-6 text-gold-600" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-museum-black">Transaction History</h2>
              <p className="text-sm text-museum-dark-gray">Recent ICP and Cycles transfers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-museum-cream rounded-xl transition-colors"
          >
            <X className="h-6 w-6 text-museum-dark-gray" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 p-4 border-b-2 border-museum-light-gray">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === 'all'
                ? 'bg-gold-500 text-white'
                : 'bg-museum-cream text-museum-dark-gray hover:bg-gold-100'
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => setFilter('ICP')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === 'ICP'
                ? 'bg-purple-500 text-white'
                : 'bg-museum-cream text-museum-dark-gray hover:bg-purple-100'
            }`}
          >
            ICP ({transactions.filter(tx => tx.token === 'ICP').length})
          </button>
          <button
            onClick={() => setFilter('CYCLES')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              filter === 'CYCLES'
                ? 'bg-blue-500 text-white'
                : 'bg-museum-cream text-museum-dark-gray hover:bg-blue-100'
            }`}
          >
            CYCLES ({transactions.filter(tx => tx.token === 'CYCLES').length})
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
              <span className="ml-3 text-museum-dark-gray">Loading transactions...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 text-museum-light-gray mx-auto mb-4" />
              <p className="text-lg font-medium text-museum-dark-gray mb-2">No transactions yet</p>
              <p className="text-sm text-museum-dark-gray">
                Your transaction history will appear here once you send or receive tokens.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="border-2 border-museum-light-gray rounded-xl p-4 hover:border-gold-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Icon */}
                      <div className={`p-2 rounded-xl ${
                        tx.type === 'send'
                          ? 'bg-red-100'
                          : 'bg-green-100'
                      }`}>
                        {tx.type === 'send' ? (
                          <ArrowUpRight className="h-5 w-5 text-red-600" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5 text-green-600" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-museum-black capitalize">
                            {tx.type}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            tx.token === 'ICP'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {tx.token}
                          </span>
                        </div>

                        <div className="text-sm text-museum-dark-gray space-y-1">
                          <p>
                            <span className="font-medium">
                              {tx.type === 'send' ? 'To: ' : 'From: '}
                            </span>
                            <span className="font-mono">
                              {shortenAddress(tx.type === 'send' ? tx.to : tx.from)}
                            </span>
                          </p>
                          <p className="text-xs text-museum-dark-gray">
                            {formatDate(tx.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        tx.type === 'send' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {tx.type === 'send' ? '-' : '+'}{formatAmount(tx.amount, tx.token)}
                      </p>
                      <a
                        href={`https://dashboard.internetcomputer.org/transaction/${tx.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gold-600 hover:text-gold-700 flex items-center gap-1 justify-end mt-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-museum-light-gray">
          <Button
            onClick={onClose}
            className="w-full rounded-xl"
            variant="outline"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
