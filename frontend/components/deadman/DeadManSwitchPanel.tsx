/**
 * Dead Man's Switch Panel
 * Complete UI for managing Dead Man's Switches
 */

'use client';

import { useState } from 'react';
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Timer,
} from 'lucide-react';
import { useDeadManSwitch, getSwitchStatusString, formatTimeRemaining, DeadManSwitchInfo } from '@/hooks/useDeadManSwitch';
import { useDualAuth } from '@/lib/auth';

export function DeadManSwitchPanel() {
  const { isConnected } = useDualAuth();
  const {
    mySwitches,
    stats,
    isLoading,
    isCreating,
    isCheckingIn,
    createSwitch,
    checkin,
    cancelSwitch,
    refetch,
  } = useDeadManSwitch();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    beneficiary: '',
    rune_id: '',
    amount: '',
    timeout_days: '30',
    message: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSwitch({
        beneficiary: formData.beneficiary,
        rune_id: formData.rune_id,
        amount: BigInt(formData.amount),
        timeout_days: BigInt(formData.timeout_days),
        message: formData.message || null,
      });
      setFormData({
        beneficiary: '',
        rune_id: '',
        amount: '',
        timeout_days: '30',
        message: '',
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create switch:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-12 w-12 text-museum-dark-gray mx-auto mb-4 opacity-50" />
        <p className="text-museum-dark-gray">Connect your wallet to manage Dead Man&apos;s Switches</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-museum-black">Dead Man&apos;s Switch</h2>
          <p className="text-sm text-museum-dark-gray">
            Automatically transfer Runes if you don&apos;t check in
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-museum-cream rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 text-museum-dark-gray ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Switch
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-museum-cream rounded-xl">
            <p className="text-xs text-museum-dark-gray uppercase">Total</p>
            <p className="text-2xl font-bold text-museum-black">{stats.total_switches.toString()}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <p className="text-xs text-green-600 uppercase">Active</p>
            <p className="text-2xl font-bold text-green-700">{stats.active_switches.toString()}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-xl">
            <p className="text-xs text-red-600 uppercase">Triggered</p>
            <p className="text-2xl font-bold text-red-700">{stats.triggered_switches.toString()}</p>
          </div>
          <div className="p-4 bg-gold-50 rounded-xl">
            <p className="text-xs text-gold-600 uppercase">Protected</p>
            <p className="text-2xl font-bold text-gold-700">{stats.total_value_protected.toString()}</p>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-museum-white border-2 border-gold-200 rounded-2xl p-6">
          <h3 className="font-semibold text-lg text-museum-black mb-4">Create New Switch</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-museum-black mb-1">
                Beneficiary Bitcoin Address
              </label>
              <input
                type="text"
                value={formData.beneficiary}
                onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                placeholder="bc1q..."
                className="w-full px-4 py-2 border border-museum-light-gray rounded-lg focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-museum-black mb-1">
                  Rune ID
                </label>
                <input
                  type="text"
                  value={formData.rune_id}
                  onChange={(e) => setFormData({ ...formData, rune_id: e.target.value })}
                  placeholder="RUNE•NAME"
                  className="w-full px-4 py-2 border border-museum-light-gray rounded-lg focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-museum-black mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="1000"
                  className="w-full px-4 py-2 border border-museum-light-gray rounded-lg focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
                  required
                  min="1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-museum-black mb-1">
                Timeout (days)
              </label>
              <select
                value={formData.timeout_days}
                onChange={(e) => setFormData({ ...formData, timeout_days: e.target.value })}
                className="w-full px-4 py-2 border border-museum-light-gray rounded-lg focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-museum-black mb-1">
                Message for Beneficiary (optional)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Instructions or message..."
                rows={2}
                className="w-full px-4 py-2 border border-museum-light-gray rounded-lg focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Switch'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-museum-light-gray rounded-lg hover:bg-museum-cream transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Switches List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-gold-600 animate-spin mx-auto mb-2" />
            <p className="text-museum-dark-gray">Loading switches...</p>
          </div>
        ) : mySwitches.length === 0 ? (
          <div className="text-center py-8 bg-museum-cream rounded-2xl">
            <Timer className="h-12 w-12 text-museum-dark-gray mx-auto mb-4 opacity-50" />
            <p className="text-museum-dark-gray mb-2">No Dead Man&apos;s Switches yet</p>
            <p className="text-sm text-museum-dark-gray">
              Create one to protect your Runes with automatic inheritance
            </p>
          </div>
        ) : (
          mySwitches.map((info) => (
            <SwitchCard
              key={info.switch.id.toString()}
              info={info}
              onCheckin={() => checkin(info.switch.id)}
              onCancel={() => cancelSwitch(info.switch.id)}
              isCheckingIn={isCheckingIn}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Individual switch card component
function SwitchCard({
  info,
  onCheckin,
  onCancel,
  isCheckingIn,
}: {
  info: DeadManSwitchInfo;
  onCheckin: () => void;
  onCancel: () => void;
  isCheckingIn: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = getSwitchStatusString(info.status);
  const isActive = status === 'Active';
  const isExpired = status === 'Expired';
  const isTriggered = status === 'Triggered';

  return (
    <div
      className={`border-2 rounded-2xl overflow-hidden transition-all ${
        isTriggered
          ? 'border-red-200 bg-red-50'
          : isExpired
          ? 'border-orange-200 bg-orange-50'
          : 'border-green-200 bg-green-50'
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isActive && <CheckCircle className="h-5 w-5 text-green-600" />}
            {isExpired && <AlertTriangle className="h-5 w-5 text-orange-600" />}
            {isTriggered && <XCircle className="h-5 w-5 text-red-600" />}
            <div>
              <p className="font-semibold text-museum-black">
                {info.switch.amount.toString()} {info.switch.rune_id}
              </p>
              <p className="text-xs text-museum-dark-gray">
                ID: {info.switch.id.toString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                isActive
                  ? 'bg-green-100 text-green-700'
                  : isExpired
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {status}
            </span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-black/10 rounded"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {isActive && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-museum-dark-gray mb-1">
              <span>Time remaining: {formatTimeRemaining(info.time_remaining_ns)}</span>
              <span>{info.elapsed_percentage}%</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  info.elapsed_percentage > 80
                    ? 'bg-red-500'
                    : info.elapsed_percentage > 50
                    ? 'bg-orange-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${info.elapsed_percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-black/10 p-4 bg-white/50">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-museum-dark-gray">Beneficiary:</span>
              <p className="font-mono text-xs break-all">{info.switch.beneficiary}</p>
            </div>
            {info.switch.message && (
              <div>
                <span className="text-museum-dark-gray">Message:</span>
                <p className="text-museum-black">{info.switch.message}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {isActive && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={onCheckin}
                disabled={isCheckingIn}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Clock className="h-4 w-4" />
                {isCheckingIn ? 'Checking in...' : 'Check In'}
              </button>
              <button
                onClick={onCancel}
                className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DeadManSwitchPanel;
