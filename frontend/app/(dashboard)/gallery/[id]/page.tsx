'use client';

/**
 * Ordinal Detail Page
 * Display detailed information about a Bitcoin Ordinal Inscription
 */

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useOrdinal, useOrdinalContent } from '@/hooks/useOrdinals';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Image,
  FileText,
  Music,
  Video,
  Code,
  Calendar,
  Hash,
  Box,
  Wallet,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fadeInUp, staggerContainer, staggerItem } from '@/design-system/motion/presets';
import { useState } from 'react';

// Content type icon mapper
function getContentIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('text/')) return FileText;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.includes('json')) return Code;
  return FileText;
}

// Rarity color mapper
function getRarityStyle(rarity: string) {
  switch (rarity) {
    case 'mythic':
      return { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
    case 'legendary':
      return { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    case 'epic':
      return { text: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' };
    case 'rare':
      return { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    case 'uncommon':
      return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    default:
      return { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
  }
}

export default function OrdinalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inscriptionId = params.id as string;

  const { ordinal, isLoading, isError, error } = useOrdinal(inscriptionId);
  const contentUrl = useOrdinalContent(inscriptionId);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-10 w-10 text-gold-500 animate-spin mb-4" />
        <p className="text-museum-dark-gray">Loading inscription...</p>
      </div>
    );
  }

  // Error state
  if (isError || !ordinal) {
    return (
      <div className="space-y-6">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Gallery
        </Button>

        <div className="text-center py-16">
          <p className="text-red-600 mb-2">Failed to load inscription</p>
          <p className="text-sm text-museum-dark-gray">{error?.message || 'Inscription not found'}</p>
        </div>
      </div>
    );
  }

  const ContentIcon = getContentIcon(ordinal.content_type);
  const isImage = ordinal.content_type.startsWith('image/');
  const isText = ordinal.content_type.startsWith('text/') || ordinal.content_type.includes('json');
  const rarityStyle = getRarityStyle(ordinal.sat_rarity);

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Button
        onClick={() => router.back()}
        variant="outline"
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Gallery
      </Button>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Content Preview */}
        <motion.div
          className="space-y-6"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
        >
          {/* Content Display */}
          <div className="bg-museum-white border border-museum-light-gray rounded-xl overflow-hidden">
            <div className="aspect-square bg-museum-cream flex items-center justify-center">
              {isImage && contentUrl ? (
                <img
                  src={contentUrl}
                  alt={`Inscription #${ordinal.number}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`flex flex-col items-center justify-center ${isImage ? 'hidden' : ''}`}>
                <ContentIcon className="h-24 w-24 text-museum-light-gray mb-4" />
                <p className="text-museum-dark-gray text-sm">
                  {ordinal.content_type.split('/')[1]?.toUpperCase() || 'Content'}
                </p>
              </div>
            </div>

            {/* Content Actions */}
            <div className="p-4 border-t border-museum-light-gray">
              <div className="flex items-center justify-between">
                <span className="text-sm text-museum-dark-gray">
                  {ordinal.content_type}
                </span>
                <a
                  href={contentUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700"
                >
                  View Raw Content
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Rarity Badge */}
          <div className={`${rarityStyle.bg} ${rarityStyle.border} border rounded-xl p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-museum-dark-gray mb-1">Sat Rarity</p>
                <p className={`text-lg font-bold capitalize ${rarityStyle.text}`}>
                  {ordinal.sat_rarity}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-museum-dark-gray mb-1">Sat Ordinal</p>
                <p className="text-lg font-bold text-museum-black">
                  {ordinal.sat_ordinal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column - Details */}
        <motion.div
          className="space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={staggerItem}>
            <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
              Inscription #{ordinal.number.toLocaleString()}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm px-2 py-1 bg-museum-cream rounded text-museum-dark-gray">
                {ordinal.content_type.split('/')[1]?.toUpperCase()}
              </span>
              <span className="text-sm text-museum-dark-gray">
                {formatBytes(ordinal.content_length)}
              </span>
              {ordinal.recursive && (
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                  Recursive
                </span>
              )}
            </div>
          </motion.div>

          {/* Inscription ID */}
          <motion.div
            className="bg-museum-white border border-museum-light-gray rounded-xl p-4"
            variants={staggerItem}
          >
            <p className="text-sm text-museum-dark-gray mb-2">Inscription ID</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-museum-black bg-museum-cream px-3 py-2 rounded truncate">
                {ordinal.id}
              </code>
              <button
                onClick={() => copyToClipboard(ordinal.id, 'id')}
                className="p-2 hover:bg-museum-cream rounded transition-colors"
              >
                {copiedField === 'id' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-museum-dark-gray" />
                )}
              </button>
            </div>
          </motion.div>

          {/* Details Grid */}
          <motion.div
            className="bg-museum-white border border-museum-light-gray rounded-xl divide-y divide-museum-light-gray"
            variants={staggerItem}
          >
            {/* Genesis Block */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Box className="h-5 w-5 text-museum-dark-gray" />
                <span className="text-sm text-museum-dark-gray">Genesis Block</span>
              </div>
              <span className="text-sm font-medium text-museum-black">
                {ordinal.genesis_block_height.toLocaleString()}
              </span>
            </div>

            {/* Genesis Timestamp */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-museum-dark-gray" />
                <span className="text-sm text-museum-dark-gray">Inscribed</span>
              </div>
              <span className="text-sm font-medium text-museum-black">
                {formatDate(ordinal.genesis_timestamp)}
              </span>
            </div>

            {/* Current Owner */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="h-5 w-5 text-museum-dark-gray" />
                <span className="text-sm text-museum-dark-gray">Current Owner</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-museum-black bg-museum-cream px-3 py-2 rounded">
                  {truncateAddress(ordinal.address)}
                </code>
                <button
                  onClick={() => copyToClipboard(ordinal.address, 'address')}
                  className="p-2 hover:bg-museum-cream rounded transition-colors"
                >
                  {copiedField === 'address' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-museum-dark-gray" />
                  )}
                </button>
              </div>
            </div>

            {/* Genesis Transaction */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <Hash className="h-5 w-5 text-museum-dark-gray" />
                <span className="text-sm text-museum-dark-gray">Genesis Transaction</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-museum-black bg-museum-cream px-3 py-2 rounded truncate">
                  {ordinal.genesis_tx_id}
                </code>
                <a
                  href={`https://mempool.space/tx/${ordinal.genesis_tx_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-museum-cream rounded transition-colors"
                >
                  <ExternalLink className="h-4 w-4 text-museum-dark-gray" />
                </a>
              </div>
            </div>

            {/* Value */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-museum-dark-gray" />
                <span className="text-sm text-museum-dark-gray">Output Value</span>
              </div>
              <span className="text-sm font-medium text-museum-black">
                {ordinal.value.toLocaleString()} sats
              </span>
            </div>

            {/* Genesis Fee */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-museum-dark-gray" />
                <span className="text-sm text-museum-dark-gray">Genesis Fee</span>
              </div>
              <span className="text-sm font-medium text-museum-black">
                {ordinal.genesis_fee.toLocaleString()} sats
              </span>
            </div>
          </motion.div>

          {/* External Links */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3"
            variants={staggerItem}
          >
            <a
              href={`https://ordinals.com/inscription/${ordinal.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                <ExternalLink className="h-4 w-4" />
                View on Ordinals.com
              </Button>
            </a>
            <a
              href={`https://mempool.space/tx/${ordinal.genesis_tx_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                <ExternalLink className="h-4 w-4" />
                View on Mempool
              </Button>
            </a>
          </motion.div>

          {/* Additional Info */}
          {ordinal.curse_type && (
            <motion.div
              className="bg-red-50 border border-red-200 rounded-xl p-4"
              variants={staggerItem}
            >
              <p className="text-sm font-medium text-red-700">Cursed Inscription</p>
              <p className="text-sm text-red-600">{ordinal.curse_type}</p>
            </motion.div>
          )}

          {ordinal.recursive && ordinal.recursion_refs && ordinal.recursion_refs.length > 0 && (
            <motion.div
              className="bg-blue-50 border border-blue-200 rounded-xl p-4"
              variants={staggerItem}
            >
              <p className="text-sm font-medium text-blue-700 mb-2">Recursion References</p>
              <div className="space-y-1">
                {ordinal.recursion_refs.map((ref, i) => (
                  <code key={i} className="block text-xs font-mono text-blue-600 truncate">
                    {ref}
                  </code>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
