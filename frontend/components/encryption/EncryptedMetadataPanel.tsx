/**
 * Encrypted Metadata Panel
 * Production-ready UI for managing vetKeys encrypted Rune metadata
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Clock,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RefreshCw,
  Key,
  Shield,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useEncryptedMetadata, EncryptedRuneMetadata } from '@/hooks/useEncryptedMetadata';
import { useDualAuth } from '@/lib/auth';
import { toast } from 'sonner';

export function EncryptedMetadataPanel() {
  const { isConnected } = useDualAuth();
  const {
    myMetadata,
    isLoading,
    isStoring,
    isDeleting,
    isDecrypting,
    storeMetadata,
    deleteMetadata,
    decryptMetadata,
    canDecrypt,
    refetch,
  } = useEncryptedMetadata();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    rune_id: '',
    metadata: '',
    enable_reveal: false,
    reveal_date: '',
    reveal_time: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let revealTime: Date | undefined;

      if (formData.enable_reveal && formData.reveal_date) {
        const dateTime = formData.reveal_time
          ? `${formData.reveal_date}T${formData.reveal_time}`
          : `${formData.reveal_date}T00:00`;
        revealTime = new Date(dateTime);

        if (revealTime <= new Date()) {
          toast.error('Reveal time must be in the future');
          return;
        }
      }

      await storeMetadata(formData.rune_id, formData.metadata, revealTime);

      setFormData({
        rune_id: '',
        metadata: '',
        enable_reveal: false,
        reveal_date: '',
        reveal_time: '',
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to store metadata:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-8 text-center">
        <Lock className="h-12 w-12 text-museum-dark-gray mx-auto mb-4 opacity-50" />
        <p className="text-museum-dark-gray">Connect your wallet to manage encrypted metadata</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-museum-black flex items-center gap-2">
            <Key className="h-6 w-6 text-purple-600" />
            Encrypted Metadata
          </h2>
          <p className="text-sm text-museum-dark-gray">
            Secure your Rune metadata with vetKeys encryption
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
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Encrypt Metadata
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-purple-800 font-medium">
              Powered by ICP vetKeys
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Your metadata is encrypted using threshold cryptography.
              Only you (or anyone after the reveal time) can decrypt it.
            </p>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-museum-white border-2 border-purple-200 rounded-2xl p-6">
          <h3 className="font-semibold text-lg text-museum-black mb-4">
            Encrypt New Metadata
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-museum-black mb-1">
                Rune ID
              </label>
              <input
                type="text"
                value={formData.rune_id}
                onChange={(e) => setFormData({ ...formData, rune_id: e.target.value })}
                placeholder="RUNE•NAME"
                className="w-full px-4 py-2 border border-museum-light-gray rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-museum-black mb-1">
                Metadata (JSON or text)
              </label>
              <textarea
                value={formData.metadata}
                onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                placeholder='{"description": "My secret Rune metadata", "image": "ipfs://..."}'
                rows={4}
                className="w-full px-4 py-2 border border-museum-light-gray rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono text-sm"
                required
              />
            </div>

            <div className="border-t border-museum-light-gray pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enable_reveal}
                  onChange={(e) => setFormData({ ...formData, enable_reveal: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded border-museum-light-gray focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium text-museum-black">
                    Enable time-locked reveal
                  </span>
                  <p className="text-xs text-museum-dark-gray">
                    Others can decrypt after the specified date
                  </p>
                </div>
              </label>

              {formData.enable_reveal && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-museum-black mb-1">
                      Reveal Date
                    </label>
                    <input
                      type="date"
                      value={formData.reveal_date}
                      onChange={(e) => setFormData({ ...formData, reveal_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-museum-light-gray rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      required={formData.enable_reveal}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-museum-black mb-1">
                      Reveal Time (optional)
                    </label>
                    <input
                      type="time"
                      value={formData.reveal_time}
                      onChange={(e) => setFormData({ ...formData, reveal_time: e.target.value })}
                      className="w-full px-4 py-2 border border-museum-light-gray rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isStoring}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Lock className="h-4 w-4" />
                {isStoring ? 'Encrypting...' : 'Encrypt & Store'}
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

      {/* Metadata List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-2" />
            <p className="text-museum-dark-gray">Loading encrypted metadata...</p>
          </div>
        ) : myMetadata.length === 0 ? (
          <div className="text-center py-8 bg-museum-cream rounded-2xl">
            <Lock className="h-12 w-12 text-museum-dark-gray mx-auto mb-4 opacity-50" />
            <p className="text-museum-dark-gray mb-2">No encrypted metadata yet</p>
            <p className="text-sm text-museum-dark-gray">
              Encrypt your Rune metadata to protect sensitive information
            </p>
          </div>
        ) : (
          myMetadata.map((meta) => (
            <MetadataCard
              key={meta.rune_id}
              metadata={meta}
              onDecrypt={() => decryptMetadata(meta.rune_id)}
              onDelete={() => deleteMetadata(meta.rune_id)}
              onCanDecrypt={() => canDecrypt(meta.rune_id)}
              isDeleting={isDeleting}
              isDecrypting={isDecrypting}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Individual metadata card component
function MetadataCard({
  metadata,
  onDecrypt,
  onDelete,
  onCanDecrypt,
  isDeleting,
  isDecrypting,
}: {
  metadata: EncryptedRuneMetadata;
  onDecrypt: () => Promise<any>;
  onDelete: () => Promise<any>;
  onCanDecrypt: () => Promise<boolean>;
  isDeleting: boolean;
  isDecrypting: boolean;
}) {
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [isDecryptingThis, setIsDecryptingThis] = useState(false);
  const [canDecryptState, setCanDecryptState] = useState<boolean | null>(null);

  const hasRevealTime = metadata.reveal_time !== null;
  const revealDate = hasRevealTime
    ? new Date(Number(metadata.reveal_time) / 1_000_000)
    : null;
  const isRevealed = revealDate ? new Date() >= revealDate : false;

  const handleDecrypt = async () => {
    setIsDecryptingThis(true);
    try {
      const result = await onDecrypt();
      if (result) {
        setDecryptedContent(result.text);
        toast.success('Metadata decrypted successfully');
      }
    } catch (error) {
      toast.error('Failed to decrypt metadata');
    } finally {
      setIsDecryptingThis(false);
    }
  };

  const checkCanDecrypt = async () => {
    const can = await onCanDecrypt();
    setCanDecryptState(can);
  };

  // Check decryption permission on mount
  useEffect(() => {
    checkCanDecrypt();
  }, []);

  return (
    <div className="border-2 border-purple-200 rounded-2xl overflow-hidden bg-purple-50">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {decryptedContent ? (
              <Unlock className="h-5 w-5 text-green-600" />
            ) : (
              <Lock className="h-5 w-5 text-purple-600" />
            )}
            <div>
              <p className="font-semibold text-museum-black">{metadata.rune_id}</p>
              <p className="text-xs text-museum-dark-gray">
                {metadata.encrypted_data.length} bytes encrypted
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasRevealTime && (
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                  isRevealed
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {isRevealed ? (
                  <>
                    <Eye className="h-3 w-3" />
                    Revealed
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    Time-locked
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reveal time info */}
        {hasRevealTime && revealDate && (
          <div className="mt-3 flex items-center gap-2 text-xs text-museum-dark-gray">
            <Calendar className="h-3 w-3" />
            {isRevealed ? 'Revealed on' : 'Reveals on'}: {revealDate.toLocaleString()}
          </div>
        )}

        {/* Decrypted content */}
        {decryptedContent && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
            <p className="text-xs text-museum-dark-gray mb-1">Decrypted content:</p>
            <pre className="text-sm font-mono text-museum-black whitespace-pre-wrap break-all">
              {decryptedContent}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {!decryptedContent && (
            <button
              onClick={handleDecrypt}
              disabled={isDecryptingThis || isDecrypting}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" />
              {isDecryptingThis ? 'Decrypting...' : 'Decrypt'}
            </button>
          )}
          {decryptedContent && (
            <button
              onClick={() => setDecryptedContent(null)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-museum-dark-gray text-white rounded-lg hover:bg-museum-black transition-colors"
            >
              <EyeOff className="h-4 w-4" />
              Hide
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default EncryptedMetadataPanel;
