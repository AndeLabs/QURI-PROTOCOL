'use client';

/**
 * Saved Addresses Component
 * Manages user's saved Bitcoin addresses with localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Trash2,
  Plus,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { validateBitcoinAddress, getAddressTypeName, truncateAddress } from '@/lib/utils/bitcoin';
import type { SavedAddress } from '@/types/settlement';
import { ButtonPremium } from '@/components/ui/ButtonPremium';

const STORAGE_KEY = 'quri_saved_addresses';

// ============================================================================
// HOOK: useSavedAddresses
// ============================================================================

export function useSavedAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAddresses(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load saved addresses:', err);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((newAddresses: SavedAddress[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAddresses));
      setAddresses(newAddresses);
    } catch (err) {
      console.error('Failed to save addresses:', err);
    }
  }, []);

  // Add new address
  const addAddress = useCallback((address: string, label: string) => {
    const validation = validateBitcoinAddress(address);
    if (!validation.valid) return false;

    const newAddress: SavedAddress = {
      id: `addr_${Date.now()}`,
      address,
      label,
      type: validation.type,
      network: validation.network,
      isPrimary: addresses.length === 0,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      useCount: 0,
    };

    saveToStorage([...addresses, newAddress]);
    return true;
  }, [addresses, saveToStorage]);

  // Remove address
  const removeAddress = useCallback((id: string) => {
    const newAddresses = addresses.filter((a) => a.id !== id);
    // If we removed the primary, make the first one primary
    if (newAddresses.length > 0 && !newAddresses.some((a) => a.isPrimary)) {
      newAddresses[0].isPrimary = true;
    }
    saveToStorage(newAddresses);
  }, [addresses, saveToStorage]);

  // Update address
  const updateAddress = useCallback((id: string, updates: Partial<SavedAddress>) => {
    const newAddresses = addresses.map((a) =>
      a.id === id ? { ...a, ...updates } : a
    );
    saveToStorage(newAddresses);
  }, [addresses, saveToStorage]);

  // Set primary
  const setPrimary = useCallback((id: string) => {
    const newAddresses = addresses.map((a) => ({
      ...a,
      isPrimary: a.id === id,
    }));
    saveToStorage(newAddresses);
  }, [addresses, saveToStorage]);

  // Record usage
  const recordUsage = useCallback((id: string) => {
    const newAddresses = addresses.map((a) =>
      a.id === id
        ? { ...a, lastUsedAt: Date.now(), useCount: a.useCount + 1 }
        : a
    );
    saveToStorage(newAddresses);
  }, [addresses, saveToStorage]);

  // Get primary address
  const getPrimary = useCallback(() => {
    return addresses.find((a) => a.isPrimary) || addresses[0];
  }, [addresses]);

  return {
    addresses,
    isLoaded,
    addAddress,
    removeAddress,
    updateAddress,
    setPrimary,
    recordUsage,
    getPrimary,
  };
}

// ============================================================================
// COMPONENT: SavedAddressesList
// ============================================================================

interface SavedAddressesListProps {
  onSelect: (address: string) => void;
  selectedAddress?: string;
  className?: string;
}

export function SavedAddressesList({
  onSelect,
  selectedAddress,
  className = '',
}: SavedAddressesListProps) {
  const {
    addresses,
    isLoaded,
    addAddress,
    removeAddress,
    updateAddress,
    setPrimary,
    recordUsage,
  } = useSavedAddresses();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  if (!isLoaded) return null;

  const handleSelect = (address: SavedAddress) => {
    onSelect(address.address);
    recordUsage(address.id);
  };

  const handleAdd = () => {
    if (newAddress && newLabel) {
      const success = addAddress(newAddress, newLabel);
      if (success) {
        setNewAddress('');
        setNewLabel('');
        setShowAddForm(false);
      }
    }
  };

  const handleStartEdit = (address: SavedAddress) => {
    setEditingId(address.id);
    setEditLabel(address.label);
  };

  const handleSaveEdit = (id: string) => {
    updateAddress(id, { label: editLabel });
    setEditingId(null);
    setEditLabel('');
  };

  if (addresses.length === 0 && !showAddForm) {
    return (
      <div className={`p-4 bg-museum-cream/50 rounded-xl text-center ${className}`}>
        <p className="text-sm text-museum-dark-gray mb-3">
          No saved addresses yet
        </p>
        <ButtonPremium
          variant="secondary"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setShowAddForm(true)}
        >
          Add Address
        </ButtonPremium>
      </div>
    );
  }

  return (
    <div className={`border border-museum-light-gray rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-museum-cream/50
                 hover:bg-museum-cream transition-colors"
      >
        <span className="text-sm font-medium text-museum-black">
          Saved Addresses ({addresses.length})
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-museum-dark-gray" />
        ) : (
          <ChevronDown className="h-4 w-4 text-museum-dark-gray" />
        )}
      </button>

      {/* Address List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-museum-light-gray">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`flex items-center gap-3 p-3 hover:bg-museum-cream/30
                           transition-colors cursor-pointer ${
                             selectedAddress === address.address
                               ? 'bg-gold-50'
                               : ''
                           }`}
                  onClick={() => handleSelect(address)}
                >
                  {/* Primary Star */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimary(address.id);
                    }}
                    className={`p-1 rounded transition-colors ${
                      address.isPrimary
                        ? 'text-gold-500'
                        : 'text-museum-light-gray hover:text-gold-400'
                    }`}
                    title={address.isPrimary ? 'Primary address' : 'Set as primary'}
                  >
                    <Star
                      className="h-4 w-4"
                      fill={address.isPrimary ? 'currentColor' : 'none'}
                    />
                  </button>

                  {/* Address Info */}
                  <div className="flex-1 min-w-0">
                    {editingId === address.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(address.id);
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-museum-black truncate">
                          {address.label}
                        </p>
                        <p className="text-xs font-mono text-museum-dark-gray">
                          {truncateAddress(address.address)}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Type Badge */}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    address.type === 'p2tr'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {address.type === 'p2tr' ? 'Taproot' : 'SegWit'}
                  </span>

                  {/* Actions */}
                  {editingId !== address.id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(address);
                        }}
                        className="p-1 text-museum-dark-gray hover:text-museum-black
                                 hover:bg-museum-cream rounded transition-colors"
                        title="Edit label"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAddress(address.id);
                        }}
                        className="p-1 text-museum-dark-gray hover:text-red-600
                                 hover:bg-red-50 rounded transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add New Form */}
              {showAddForm && (
                <div className="p-3 space-y-2 bg-museum-cream/30">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Label (e.g., 'Main Wallet')"
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Bitcoin address (bc1p...)"
                    className="w-full px-3 py-2 text-sm font-mono border rounded-lg"
                  />
                  <div className="flex gap-2">
                    <ButtonPremium
                      variant="primary"
                      size="sm"
                      onClick={handleAdd}
                      disabled={!newAddress || !newLabel}
                      className="flex-1"
                    >
                      Save
                    </ButtonPremium>
                    <ButtonPremium
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewAddress('');
                        setNewLabel('');
                      }}
                    >
                      Cancel
                    </ButtonPremium>
                  </div>
                </div>
              )}
            </div>

            {/* Add Button */}
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full p-3 flex items-center justify-center gap-2
                         text-sm text-gold-600 hover:bg-gold-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add New Address
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
