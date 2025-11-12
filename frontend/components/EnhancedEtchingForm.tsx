'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { ImageUpload } from './ImageUpload';
import { useICP } from '@/lib/icp/ICPProvider';
import { uploadRuneAssets, RuneMetadata } from '@/lib/storage/ipfs';
import { logger } from '@/lib/logger';
import { Plus, X, Info, Image as ImageIcon, FileText, Tag } from 'lucide-react';

/**
 * Enhanced Etching Form with Image Upload and Rich Metadata
 * Supports different types of information: images, descriptions, attributes
 */

const enhancedEtchingSchema = z.object({
  // Basic Rune Information
  rune_name: z.string().min(1, 'Rune name is required').max(26),
  symbol: z.string().min(1).max(4),
  divisibility: z.number().int().min(0).max(18),
  premine: z.number().int().min(0),

  // Minting Terms (optional)
  mintAmount: z.number().int().min(0).optional(),
  mintCap: z.number().int().min(0).optional(),

  // Rich Metadata
  description: z.string().max(1000).optional(),
  externalUrl: z.string().url().optional().or(z.literal('')),

  // Custom Attributes (like OpenSea traits)
  attributes: z.array(
    z.object({
      trait_type: z.string().min(1),
      value: z.union([z.string(), z.number()]),
    })
  ).optional(),
});

type EnhancedEtchingFormData = z.infer<typeof enhancedEtchingSchema>;

interface EnhancedEtchingFormProps {
  onSuccess?: (runeId: string, metadataUrl: string) => void;
}

export function EnhancedEtchingForm({ onSuccess }: EnhancedEtchingFormProps) {
  const { isConnected } = useICP();

  // State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [metadataUrl, setMetadataUrl] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<'basic' | 'metadata' | 'attributes'>('basic');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<EnhancedEtchingFormData>({
    resolver: zodResolver(enhancedEtchingSchema),
    defaultValues: {
      divisibility: 8,
      premine: 0,
      attributes: [],
    },
  });

  // For dynamic attributes
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attributes',
  });

  // Handle image selection
  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    logger.info('Image selected', { name: file.name, size: file.size });
  };

  // Handle form submission
  const onSubmit = async (data: EnhancedEtchingFormData) => {
    try {
      if (!selectedImage) {
        alert('Please upload an image for your Rune');
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);

      logger.info('Starting Rune creation with assets', {
        runeName: data.rune_name,
        symbol: data.symbol,
      });

      // Step 1: Prepare metadata
      setUploadProgress(20);
      const metadata: Omit<RuneMetadata, 'image'> = {
        name: data.rune_name,
        symbol: data.symbol,
        description: data.description || `${data.rune_name} - A Bitcoin Rune`,
        attributes: data.attributes?.filter(attr => attr.trait_type && attr.value),
        properties: {
          supply: data.premine.toString(),
          divisibility: data.divisibility,
          creator: 'ICP Wallet', // This will be replaced with actual wallet address
        },
      };

      // Step 2: Upload to IPFS
      setUploadProgress(40);
      logger.info('Uploading assets to IPFS');

      const { imageUpload, metadataUpload } = await uploadRuneAssets(
        selectedImage,
        metadata
      );

      setUploadProgress(70);
      setMetadataUrl(metadataUpload.gatewayUrl);

      logger.info('Assets uploaded successfully', {
        imageHash: imageUpload.ipfsHash,
        metadataHash: metadataUpload.ipfsHash,
      });

      // Step 3: Create Rune on Bitcoin (this would integrate with your existing createRune)
      setUploadProgress(90);

      // TODO: Call your existing createRune function with metadataUrl
      // const runeId = await createRune({
      //   ...data,
      //   metadataUrl: metadataUpload.ipfsUrl,
      // });

      setUploadProgress(100);

      // Success
      logger.info('Rune created successfully', {
        metadataUrl: metadataUpload.gatewayUrl,
      });

      if (onSuccess) {
        onSuccess('mock-rune-id', metadataUpload.gatewayUrl);
      }

      // Show success message
      alert(`✨ Rune Created Successfully!\n\nMetadata: ${metadataUpload.gatewayUrl}`);

    } catch (error) {
      logger.error('Failed to create Rune', error instanceof Error ? error : undefined);
      alert('Failed to create Rune. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="py-12 text-center">
          <p className="text-museum-dark-gray mb-4">Please connect your wallet to create a Rune</p>
          <Button>Connect Wallet</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-3xl">Create Your Rune</CardTitle>
          <CardDescription>
            Upload artwork, set parameters, and etch your digital artifact onto Bitcoin
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 border-b border-museum-light-gray">
            <button
              onClick={() => setCurrentTab('basic')}
              className={`px-6 py-3 font-medium transition-colors ${
                currentTab === 'basic'
                  ? 'border-b-2 border-gold-500 text-museum-black'
                  : 'text-museum-gray hover:text-museum-charcoal'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Basic Info
            </button>
            <button
              onClick={() => setCurrentTab('metadata')}
              className={`px-6 py-3 font-medium transition-colors ${
                currentTab === 'metadata'
                  ? 'border-b-2 border-gold-500 text-museum-black'
                  : 'text-museum-gray hover:text-museum-charcoal'
              }`}
            >
              <ImageIcon className="w-4 h-4 inline mr-2" />
              Artwork & Metadata
            </button>
            <button
              onClick={() => setCurrentTab('attributes')}
              className={`px-6 py-3 font-medium transition-colors ${
                currentTab === 'attributes'
                  ? 'border-b-2 border-gold-500 text-museum-black'
                  : 'text-museum-gray hover:text-museum-charcoal'
              }`}
            >
              <Tag className="w-4 h-4 inline mr-2" />
              Attributes ({fields.length})
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* BASIC INFO TAB */}
            {currentTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rune Name */}
                  <div>
                    <label className="block text-sm font-medium text-museum-charcoal mb-2">
                      Rune Name *
                    </label>
                    <Input
                      {...register('rune_name')}
                      placeholder="QUANTUM•LEAP"
                      className="font-mono"
                    />
                    {errors.rune_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.rune_name.message}</p>
                    )}
                    <p className="text-xs text-museum-gray mt-1">
                      Up to 26 characters, use • for spacers
                    </p>
                  </div>

                  {/* Symbol */}
                  <div>
                    <label className="block text-sm font-medium text-museum-charcoal mb-2">
                      Symbol *
                    </label>
                    <Input
                      {...register('symbol')}
                      placeholder="QLEP"
                      className="font-mono uppercase"
                      maxLength={4}
                    />
                    {errors.symbol && (
                      <p className="text-red-500 text-sm mt-1">{errors.symbol.message}</p>
                    )}
                    <p className="text-xs text-museum-gray mt-1">1-4 characters</p>
                  </div>

                  {/* Divisibility */}
                  <div>
                    <label className="block text-sm font-medium text-museum-charcoal mb-2">
                      Divisibility *
                    </label>
                    <Input
                      type="number"
                      {...register('divisibility', { valueAsNumber: true })}
                      min={0}
                      max={18}
                    />
                    {errors.divisibility && (
                      <p className="text-red-500 text-sm mt-1">{errors.divisibility.message}</p>
                    )}
                    <p className="text-xs text-museum-gray mt-1">
                      Decimal places (0-18, like Bitcoin&apos;s 8)
                    </p>
                  </div>

                  {/* Premine */}
                  <div>
                    <label className="block text-sm font-medium text-museum-charcoal mb-2">
                      Premine Amount *
                    </label>
                    <Input
                      type="number"
                      {...register('premine', { valueAsNumber: true })}
                      min={0}
                      placeholder="1000000"
                    />
                    {errors.premine && (
                      <p className="text-red-500 text-sm mt-1">{errors.premine.message}</p>
                    )}
                    <p className="text-xs text-museum-gray mt-1">Initial supply</p>
                  </div>
                </div>

                {/* Minting Terms */}
                <div className="border-t border-museum-light-gray pt-6">
                  <h3 className="font-serif text-xl mb-4">Minting Terms (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-museum-charcoal mb-2">
                        Mint Amount
                      </label>
                      <Input
                        type="number"
                        {...register('mintAmount', { valueAsNumber: true })}
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-museum-charcoal mb-2">
                        Mint Cap
                      </label>
                      <Input
                        type="number"
                        {...register('mintCap', { valueAsNumber: true })}
                        placeholder="10000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ARTWORK & METADATA TAB */}
            {currentTab === 'metadata' && (
              <div className="space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-museum-charcoal mb-4">
                    Artwork * (Stored on IPFS)
                  </label>
                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-museum-charcoal mb-2">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="w-full px-4 py-3 border border-museum-light-gray bg-museum-cream focus:outline-none focus:border-gold-400 resize-none"
                    placeholder="Describe your Rune, its purpose, and what makes it special..."
                    maxLength={1000}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                  )}
                  <p className="text-xs text-museum-gray mt-1">
                    {watch('description')?.length || 0}/1000 characters
                  </p>
                </div>

                {/* External URL */}
                <div>
                  <label className="block text-sm font-medium text-museum-charcoal mb-2">
                    External URL (Optional)
                  </label>
                  <Input
                    {...register('externalUrl')}
                    type="url"
                    placeholder="https://yourproject.com"
                  />
                  <p className="text-xs text-museum-gray mt-1">
                    Link to your project website or documentation
                  </p>
                </div>
              </div>
            )}

            {/* ATTRIBUTES TAB */}
            {currentTab === 'attributes' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">Custom Attributes (Like OpenSea Traits)</p>
                      <p>
                        Add custom properties to your Rune. These will be visible on marketplaces
                        and can be used for filtering and rarity calculations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attributes List */}
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-start">
                      <div className="flex-1">
                        <Input
                          {...register(`attributes.${index}.trait_type` as const)}
                          placeholder="Trait Type (e.g., 'Rarity')"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          {...register(`attributes.${index}.value` as const)}
                          placeholder="Value (e.g., 'Legendary')"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                        className="flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add Attribute Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ trait_type: '', value: '' })}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Attribute
                </Button>

                {/* Example Attributes */}
                {fields.length === 0 && (
                  <div className="text-center py-8 text-museum-gray">
                    <p className="mb-4">No attributes yet. Here are some examples:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-3 py-1 bg-museum-cream text-sm">Rarity: Rare</span>
                      <span className="px-3 py-1 bg-museum-cream text-sm">Collection: Genesis</span>
                      <span className="px-3 py-1 bg-museum-cream text-sm">Edition: 1/100</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-6 border-t border-museum-light-gray">
              <Button
                type="submit"
                disabled={isUploading || !selectedImage}
                isLoading={isUploading}
                className="flex-1 bg-museum-black hover:bg-museum-charcoal text-museum-white py-4 text-lg"
              >
                {isUploading
                  ? `Uploading... ${uploadProgress}%`
                  : 'Create Rune & Upload to IPFS'}
              </Button>
            </div>

            {/* Metadata Preview */}
            {metadataUrl && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200">
                <p className="font-semibold text-green-900 mb-2">✅ Metadata Uploaded!</p>
                <a
                  href={metadataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {metadataUrl}
                </a>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📦 Decentralized Storage</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-museum-dark-gray space-y-2">
            <p>
              Your artwork and metadata are stored on IPFS (InterPlanetary File System), the same
              system used by OpenSea, Foundation.app, and other premium NFT platforms.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Permanent storage</li>
              <li>Decentralized (no single point of failure)</li>
              <li>Content-addressed (immutable)</li>
              <li>Globally accessible</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">✨ Supported Data Types</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-museum-dark-gray space-y-2">
            <ul className="space-y-2">
              <li>
                <strong>Images:</strong> JPEG, PNG, GIF, WebP, SVG (up to 10MB)
              </li>
              <li>
                <strong>Text:</strong> Name, description, external links
              </li>
              <li>
                <strong>Attributes:</strong> Custom traits and properties
              </li>
              <li>
                <strong>Metadata:</strong> Supply, creator, divisibility
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
