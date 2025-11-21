'use client';

/**
 * Inscribe Ordinal Page
 * Create new Bitcoin Ordinal Inscriptions
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Image,
  FileText,
  Code,
  AlertCircle,
  Check,
  Loader2,
  Info,
  Wallet,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDualAuth } from '@/lib/auth';
import { WalletButton } from '@/components/wallet';
import { fadeInUp } from '@/design-system/motion/presets';

type ContentType = 'image' | 'text' | 'json' | 'html';

interface InscriptionPreview {
  type: ContentType;
  content: string | ArrayBuffer;
  mimeType: string;
  size: number;
  name?: string;
}

export default function InscribePage() {
  const { isConnected } = useDualAuth();
  const [selectedType, setSelectedType] = useState<ContentType>('image');
  const [preview, setPreview] = useState<InscriptionPreview | null>(null);
  const [textContent, setTextContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const contentTypes = [
    { type: 'image' as ContentType, label: 'Image', icon: Image, accept: 'image/*', description: 'PNG, JPEG, GIF, WebP, SVG' },
    { type: 'text' as ContentType, label: 'Text', icon: FileText, accept: 'text/plain', description: 'Plain text content' },
    { type: 'json' as ContentType, label: 'JSON', icon: Code, accept: 'application/json', description: 'JSON data' },
    { type: 'html' as ContentType, label: 'HTML', icon: Code, accept: 'text/html', description: 'HTML content' },
  ];

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview({
        type: selectedType,
        content: e.target?.result || '',
        mimeType: file.type,
        size: file.size,
        name: file.name,
      });
    };

    if (selectedType === 'image') {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleTextChange = (value: string) => {
    setTextContent(value);
    if (value) {
      const mimeType = selectedType === 'json' ? 'application/json' :
                       selectedType === 'html' ? 'text/html' : 'text/plain';
      setPreview({
        type: selectedType,
        content: value,
        mimeType,
        size: new Blob([value]).size,
      });
    } else {
      setPreview(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleInscribe = async () => {
    if (!preview) return;

    setIsSubmitting(true);
    // TODO: Implement actual inscription logic
    // This would connect to Bitcoin network or use a service
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);

    // Show success message or redirect
    alert('Inscription feature coming soon! This will connect to Bitcoin network.');
  };

  if (!isConnected) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
            Inscribe Ordinal
          </h1>
          <p className="text-museum-dark-gray">
            Create a new Bitcoin Ordinal inscription
          </p>
        </div>

        <div className="border-2 border-dashed border-museum-light-gray rounded-2xl p-12 text-center">
          <Wallet className="h-16 w-16 text-museum-dark-gray mx-auto mb-6" />
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-3">
            Connect Your Wallet
          </h2>
          <p className="text-museum-dark-gray mb-8 max-w-md mx-auto">
            Connect with Internet Identity to create Ordinal inscriptions on Bitcoin
          </p>
          <div className="max-w-sm mx-auto">
            <WalletButton variant="default" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          Inscribe Ordinal
        </h1>
        <p className="text-museum-dark-gray">
          Create a new Bitcoin Ordinal inscription
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Type Selection */}
          <motion.div
            className="bg-museum-white border border-museum-light-gray rounded-xl p-6"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="font-semibold text-museum-black mb-4">Content Type</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {contentTypes.map(({ type, label, icon: Icon, description }) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type);
                    setPreview(null);
                    setTextContent('');
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedType === type
                      ? 'border-gold-500 bg-gold-50'
                      : 'border-museum-light-gray hover:border-gold-300'
                  }`}
                >
                  <Icon className={`h-6 w-6 mb-2 ${
                    selectedType === type ? 'text-gold-600' : 'text-museum-dark-gray'
                  }`} />
                  <p className={`font-medium text-sm ${
                    selectedType === type ? 'text-gold-700' : 'text-museum-black'
                  }`}>
                    {label}
                  </p>
                  <p className="text-xs text-museum-dark-gray mt-1">{description}</p>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content Input */}
          <motion.div
            className="bg-museum-white border border-museum-light-gray rounded-xl p-6"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
          >
            <h2 className="font-semibold text-museum-black mb-4">Content</h2>

            {selectedType === 'image' ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-gold-500 bg-gold-50'
                    : 'border-museum-light-gray hover:border-gold-300'
                }`}
              >
                <Upload className="h-10 w-10 text-museum-dark-gray mx-auto mb-4" />
                <p className="text-museum-black font-medium mb-2">
                  Drop your image here or click to upload
                </p>
                <p className="text-sm text-museum-dark-gray mb-4">
                  Max file size: 400 KB
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                >
                  Choose File
                </label>
              </div>
            ) : (
              <textarea
                value={textContent}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={
                  selectedType === 'json'
                    ? '{\n  "name": "My Inscription",\n  "description": "..."\n}'
                    : selectedType === 'html'
                    ? '<html>\n  <body>Hello World</body>\n</html>'
                    : 'Enter your text content here...'
                }
                className="w-full h-48 p-4 border border-museum-light-gray rounded-lg font-mono text-sm
                         focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent
                         resize-none"
              />
            )}
          </motion.div>

          {/* Info Card */}
          <motion.div
            className="bg-blue-50 border border-blue-200 rounded-xl p-6"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
          >
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">About Ordinal Inscriptions</h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Inscriptions are permanently stored on the Bitcoin blockchain</li>
                  <li>• Each inscription is tied to a specific satoshi</li>
                  <li>• Content cannot be modified or deleted after inscription</li>
                  <li>• Fees depend on content size and network congestion</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Preview & Actions */}
        <div className="space-y-6">
          {/* Preview */}
          <motion.div
            className="bg-museum-white border border-museum-light-gray rounded-xl p-6"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
          >
            <h2 className="font-semibold text-museum-black mb-4">Preview</h2>

            {preview ? (
              <div className="space-y-4">
                <div className="aspect-square bg-museum-cream rounded-lg overflow-hidden flex items-center justify-center">
                  {selectedType === 'image' && typeof preview.content === 'string' ? (
                    <img
                      src={preview.content}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="p-4 text-sm font-mono text-museum-dark-gray overflow-hidden max-h-full">
                      {typeof preview.content === 'string'
                        ? preview.content.slice(0, 500) + (preview.content.length > 500 ? '...' : '')
                        : 'Binary content'}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-museum-dark-gray">Type</span>
                    <span className="text-museum-black font-medium">{preview.mimeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-museum-dark-gray">Size</span>
                    <span className="text-museum-black font-medium">{formatBytes(preview.size)}</span>
                  </div>
                  {preview.name && (
                    <div className="flex justify-between">
                      <span className="text-museum-dark-gray">File</span>
                      <span className="text-museum-black font-medium truncate ml-4">{preview.name}</span>
                    </div>
                  )}
                </div>

                {preview.size > 400000 && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>File exceeds 400 KB limit</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square bg-museum-cream rounded-lg flex items-center justify-center">
                <p className="text-museum-dark-gray text-sm">No content selected</p>
              </div>
            )}
          </motion.div>

          {/* Fee Estimate */}
          <motion.div
            className="bg-museum-white border border-museum-light-gray rounded-xl p-6"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-semibold text-museum-black mb-4">Fee Estimate</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-museum-dark-gray">Network Fee</span>
                <span className="text-museum-black">~0.0001 BTC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-museum-dark-gray">Service Fee</span>
                <span className="text-museum-black">~0.00005 BTC</span>
              </div>
              <div className="border-t border-museum-light-gray pt-3 flex justify-between font-semibold">
                <span className="text-museum-black">Total</span>
                <span className="text-gold-600">~0.00015 BTC</span>
              </div>
            </div>
          </motion.div>

          {/* Inscribe Button */}
          <Button
            onClick={handleInscribe}
            disabled={!preview || preview.size > 400000 || isSubmitting}
            className="w-full bg-gold-500 hover:bg-gold-600 text-white py-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Inscription...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Inscribe on Bitcoin
              </>
            )}
          </Button>

          <p className="text-xs text-center text-museum-dark-gray">
            By inscribing, you agree to the Bitcoin network fees and understand
            that inscriptions are permanent and immutable.
          </p>
        </div>
      </div>
    </div>
  );
}
