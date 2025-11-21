/**
 * WalletButton Component
 * Connect/Disconnect button for dual auth (ICP + Bitcoin)
 */

'use client';

import { useState } from 'react';
import { Wallet, LogOut, Loader } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDualAuth, useShortenedIdentifier } from '@/lib/auth';
import { WalletModal } from './WalletModal';
import { ConnectWalletModal } from './ConnectWalletModal';
import { authToast } from '@/lib/toast';

interface WalletButtonProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function WalletButton({ variant = 'default', className = '' }: WalletButtonProps) {
  const { isConnected, isLoading, disconnect, getPrimaryPrincipal, bitcoin } = useDualAuth();
  const shortIdentifier = useShortenedIdentifier();
  const principal = getPrimaryPrincipal();
  const [showModal, setShowModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const handleConnect = () => {
    setShowConnectModal(true);
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      authToast.disconnected();
      setShowModal(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      authToast.failed('Unable to disconnect');
    }
  };

  // Compact variant for mobile/navbar
  if (variant === 'compact') {
    if (isConnected) {
      return (
        <>
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors ${className}`}
          >
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-mono text-green-900">
              {shortIdentifier || 'Connected'}
            </span>
          </button>
          <WalletModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onDisconnect={handleDisconnect}
          />
        </>
      );
    }

    return (
      <>
        <Button
          onClick={handleConnect}
          disabled={isLoading}
          size="sm"
          className={className}
        >
          {isLoading ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              Connect
            </>
          )}
        </Button>
        <ConnectWalletModal
          isOpen={showConnectModal}
          onClose={() => setShowConnectModal(false)}
        />
      </>
    );
  }

  // Default variant for main pages
  if (isConnected) {
    return (
      <>
        <div className={`space-y-3 ${className}`}>
          <div className="border border-green-200 rounded-xl p-6 bg-green-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold text-green-900">Connected</span>
            </div>
            <div className="space-y-2">
              {bitcoin.address ? (
                <>
                  <p className="text-xs text-green-700">Bitcoin Address</p>
                  <p className="font-mono text-sm text-green-900 break-all">
                    {bitcoin.address}
                  </p>
                </>
              ) : principal ? (
                <>
                  <p className="text-xs text-green-700">Principal ID</p>
                  <p className="font-mono text-sm text-green-900 break-all">
                    {principal.toText()}
                  </p>
                </>
              ) : null}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => setShowModal(true)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Wallet className="h-4 w-4 mr-2" />
                View Wallet
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        </div>
        <WalletModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onDisconnect={handleDisconnect}
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleConnect}
        disabled={isLoading}
        size="lg"
        className={`w-full ${className}`}
      >
        {isLoading ? (
          <>
            <Loader className="h-5 w-5 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="h-5 w-5 mr-2" />
            Connect Wallet
          </>
        )}
      </Button>
      <ConnectWalletModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </>
  );
}
