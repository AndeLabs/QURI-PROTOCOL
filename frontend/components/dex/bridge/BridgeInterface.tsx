import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useActor } from '../../../hooks/useActor';
import { BridgeTransaction, BridgeDirection, BridgeStatus } from '../../../types/bridge';

export const BridgeInterface: React.FC = () => {
  const { actor, loading: actorLoading } = useActor('bridge');

  const [direction, setDirection] = useState<'deposit' | 'withdrawal'>('deposit');
  const [runeId, setRuneId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [btcAddress, setBtcAddress] = useState<string>('');
  const [btcTxid, setBtcTxid] = useState<string>('');
  const [btcVout, setBtcVout] = useState<string>('0');

  const [transactions, setTransactions] = useState<BridgeTransaction[]>([]);
  const [supportedRunes, setSupportedRunes] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user transactions
  useEffect(() => {
    if (!actor) return;

    const loadTransactions = async () => {
      try {
        // TODO: Implement actual user authentication
        // const userPrincipal = await getAuthenticatedPrincipal();
        // const txs = await actor.get_user_transactions(userPrincipal);
        // setTransactions(txs);
        console.log('User authentication not yet implemented');
      } catch (err) {
        console.error('Load transactions error:', err);
      }
    };

    loadTransactions();
  }, [actor]);

  // Load supported runes
  useEffect(() => {
    if (!actor) return;

    const loadRunes = async () => {
      try {
        const runes = await actor.get_supported_runes();
        setSupportedRunes(runes);
        if (runes.length > 0) {
          setRuneId(runes[0].rune_id);
        }
      } catch (err) {
        console.error('Load runes error:', err);
      }
    };

    loadRunes();
  }, [actor]);

  // Handle deposit
  const handleDeposit = async () => {
    if (!actor) return;

    try {
      setLoading(true);
      setError(null);

      const amountNat = BigInt(Math.floor(parseFloat(amount) * 1e8));

      // TODO: Implement actual user authentication
      // const userPrincipal = await getAuthenticatedPrincipal();
      // const request = {
      //   user_icp: userPrincipal,
      //   user_btc_address: btcAddress,
      //   rune_id: runeId,
      //   rune_name: supportedRunes.find((r) => r.rune_id === runeId)?.rune_name || '',
      //   amount: amountNat,
      //   btc_txid: btcTxid,
      //   btc_vout: parseInt(btcVout),
      // };
      // const result = await actor.initiate_deposit(request);
      // if ('Ok' in result) {
      //   alert(`Deposit initiated! TX ID: ${result.Ok}`);
      //   setAmount('');
      //   setBtcTxid('');
      //   setBtcVout('0');
      // } else {
      //   setError(result.Err);
      // }

      throw new Error('User authentication not yet implemented');
    } catch (err) {
      setError(`Deposit failed: ${err}`);
      console.error('Deposit error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle withdrawal
  const handleWithdrawal = async () => {
    if (!actor) return;

    try {
      setLoading(true);
      setError(null);

      const amountNat = BigInt(Math.floor(parseFloat(amount) * 1e8));

      const runeConfig = supportedRunes.find((r) => r.rune_id === runeId);
      if (!runeConfig) {
        setError('Rune not found');
        return;
      }

      // TODO: Implement actual user authentication
      // const userPrincipal = await getAuthenticatedPrincipal();
      // const request = {
      //   user_icp: userPrincipal,
      //   user_btc_address: btcAddress,
      //   wrune_canister: runeConfig.wrune_canister,
      //   amount: amountNat,
      // };
      // const result = await actor.initiate_withdrawal(request);
      // if ('Ok' in result) {
      //   alert(`Withdrawal initiated! TX ID: ${result.Ok}`);
      //   setAmount('');
      //   setBtcAddress('');
      // } else {
      //   setError(result.Err);
      // }

      throw new Error('User authentication not yet implemented');
    } catch (err) {
      setError(`Withdrawal failed: ${err}`);
      console.error('Withdrawal error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bridge-interface">
      <h2>Runes Bridge</h2>
      <p className="subtitle">Transfer Bitcoin Runes between Bitcoin and ICP</p>

      {/* Direction Selector */}
      <div className="direction-selector">
        <button
          className={direction === 'deposit' ? 'active' : ''}
          onClick={() => setDirection('deposit')}
        >
          Bitcoin → ICP
        </button>
        <button
          className={direction === 'withdrawal' ? 'active' : ''}
          onClick={() => setDirection('withdrawal')}
        >
          ICP → Bitcoin
        </button>
      </div>

      {/* Bridge Form */}
      <div className="bridge-form">
        <div className="form-group">
          <label>Select Rune:</label>
          <select value={runeId} onChange={(e) => setRuneId(e.target.value)}>
            {supportedRunes.map((rune) => (
              <option key={rune.rune_id} value={rune.rune_id}>
                {rune.rune_name} ({rune.rune_id})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Amount:</label>
          <input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {runeId && supportedRunes.length > 0 && (
            <div className="limits">
              Min:{' '}
              {(
                Number(
                  supportedRunes.find((r) => r.rune_id === runeId)
                    ?.[direction === 'deposit' ? 'min_deposit' : 'min_withdrawal']
                ) / 1e8
              ).toFixed(4)}{' '}
              | Max:{' '}
              {(
                Number(
                  supportedRunes.find((r) => r.rune_id === runeId)
                    ?.[direction === 'deposit' ? 'max_deposit' : 'max_withdrawal']
                ) / 1e8
              ).toFixed(4)}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Your Bitcoin Address:</label>
          <input
            type="text"
            placeholder="bc1q..."
            value={btcAddress}
            onChange={(e) => setBtcAddress(e.target.value)}
          />
        </div>

        {direction === 'deposit' && (
          <>
            <div className="form-group">
              <label>Bitcoin Transaction ID:</label>
              <input
                type="text"
                placeholder="Enter Bitcoin TXID"
                value={btcTxid}
                onChange={(e) => setBtcTxid(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Output Index (vout):</label>
              <input
                type="number"
                placeholder="0"
                value={btcVout}
                onChange={(e) => setBtcVout(e.target.value)}
              />
            </div>
          </>
        )}

        {error && <div className="error-message">{error}</div>}

        <button
          className="bridge-button"
          onClick={direction === 'deposit' ? handleDeposit : handleWithdrawal}
          disabled={
            loading ||
            actorLoading ||
            !runeId ||
            !amount ||
            !btcAddress ||
            (direction === 'deposit' && !btcTxid)
          }
        >
          {loading
            ? 'Processing...'
            : direction === 'deposit'
            ? 'Bridge to ICP'
            : 'Bridge to Bitcoin'}
        </button>
      </div>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div className="transaction-history">
          <h3>Your Bridge Transactions</h3>
          <table className="transactions-table">
            <thead>
              <tr>
                <th>TX ID</th>
                <th>Direction</th>
                <th>Rune</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td title={tx.id}>{tx.id.slice(0, 16)}...</td>
                  <td>
                    {tx.direction && 'BitcoinToICP' in tx.direction
                      ? 'BTC → ICP'
                      : 'ICP → BTC'}
                  </td>
                  <td>{tx.rune_name}</td>
                  <td>{(Number(tx.amount) / 1e8).toFixed(4)}</td>
                  <td>
                    <span className={`status ${getStatusClass(tx.status)}`}>
                      {getStatusText(tx.status)}
                    </span>
                  </td>
                  <td>
                    {new Date(Number(tx.created_at) / 1000000).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

function getStatusClass(status: BridgeStatus): string {
  if ('Completed' in status) return 'completed';
  if ('Failed' in status) return 'failed';
  if ('Pending' in status || 'ConfirmingBitcoin' in status || 'ProcessingICP' in status)
    return 'pending';
  return '';
}

function getStatusText(status: BridgeStatus): string {
  if ('Pending' in status) return 'Pending';
  if ('ConfirmingBitcoin' in status)
    return `Confirming (${status.ConfirmingBitcoin.confirmations})`;
  if ('ProcessingICP' in status) return 'Processing';
  if ('Completed' in status) return 'Completed';
  if ('Failed' in status) return `Failed: ${status.Failed.reason}`;
  if ('Refunded' in status) return 'Refunded';
  return 'Unknown';
}

export default BridgeInterface;
