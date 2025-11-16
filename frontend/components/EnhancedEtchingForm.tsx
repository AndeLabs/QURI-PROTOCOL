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
import { uploadRuneAssets, RuneMetadata } from '@/lib/storage/pinata-storage';
import { logger } from '@/lib/logger';
import { Plus, X, Info, Image as ImageIcon, FileText, Tag } from 'lucide-react';
import { InfoTooltip } from './ui/Tooltip';
import { Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getAgent } from '@/lib/icp/agent';
import { useToast, ToastContainer } from './ui/Toast';

/**
 * Enhanced Etching Form with Image Upload and Rich Metadata
 * Supports different types of information: images, descriptions, attributes
 */

// Checklist item component for form completion tracking
function ChecklistItem({ completed, label, error }: { completed: boolean; label: string; error?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
        completed ? 'bg-green-500' : 'bg-gray-300'
      }`}>
        {completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${completed ? 'text-green-900' : 'text-gray-700'}`}>
          {label}
        </p>
        {error && (
          <p className="text-xs text-red-600 mt-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

const enhancedEtchingSchema = z.object({
  // Basic Rune Information
  rune_name: z.string()
    .min(1, 'Rune name is required')
    .max(26, 'Rune name must be 26 characters or less')
    .regex(/^[A-Z•]+$/, 'Rune name must contain only uppercase letters (A-Z) and spacers (•)'),
  symbol: z.string()
    .max(1, 'Symbol must be exactly 1 character')
    .optional()
    .or(z.literal(''))
    .refine((val) => !val || val.length === 1, {
      message: 'Symbol must be exactly 1 character (or leave empty for default ¤)'
    }),
  divisibility: z.number().int().min(0).max(18),
  premine: z.number().int().min(0).default(0),

  // Minting Terms (both required if using open mint)
  mintAmount: z.number().int().min(1).optional(),
  mintCap: z.number().int().min(1).optional(),

  // Rich Metadata
  description: z.string().max(1000).optional().or(z.literal('')),
  externalUrl: z.string().url().optional().or(z.literal('')).or(z.undefined()),

  // Custom Attributes (like OpenSea traits)
  attributes: z.array(
    z.object({
      trait_type: z.string().min(1),
      value: z.union([z.string(), z.number()]),
    })
  ).optional().default([]),
}).refine(
  (data) => {
    // Must have either premine OR both mint terms (amount + cap)
    const hasPremine = data.premine > 0;
    const hasMintTerms = data.mintAmount && data.mintAmount > 0 && data.mintCap && data.mintCap > 0;
    return hasPremine || hasMintTerms;
  },
  {
    message: 'Must have premine OR mint terms (both Amount and Cap). Cannot create a Rune with zero supply.',
    path: ['premine'], // Shows error on premine field
  }
).refine(
  (data) => {
    // If one mint term is set, both must be set
    const hasAmount = data.mintAmount && data.mintAmount > 0;
    const hasCap = data.mintCap && data.mintCap > 0;
    if (hasAmount !== hasCap) {
      return false;
    }
    return true;
  },
  {
    message: 'Both Mint Amount and Mint Cap must be set together (or leave both empty)',
    path: ['mintAmount'],
  }
);

type EnhancedEtchingFormData = z.infer<typeof enhancedEtchingSchema>;

interface EnhancedEtchingFormProps {
  onSuccess?: (runeId: string, metadataUrl: string) => void;
}

export function EnhancedEtchingForm({ onSuccess }: EnhancedEtchingFormProps) {
  const { isConnected, connect, isLoading } = useICP();
  const { toasts, showToast } = useToast();

  // State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [metadataUrl, setMetadataUrl] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<'basic' | 'metadata' | 'attributes'>('basic');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid, touchedFields },
    watch,
    trigger,
  } = useForm<EnhancedEtchingFormData>({
    resolver: zodResolver(enhancedEtchingSchema),
    mode: 'onChange', // Enable real-time validation
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
      // Double-check validation
      if (!selectedImage) {
        alert('⚠️ Por favor sube una imagen para tu Rune en la pestaña "Artwork & Metadata"');
        setCurrentTab('metadata');
        return;
      }

      if (!isValid) {
        // Show specific validation errors
        const errorMessages = Object.entries(errors).map(([field, error]) => {
          const fieldName = field === 'rune_name' ? 'Rune Name' :
                           field === 'symbol' ? 'Symbol' :
                           field === 'divisibility' ? 'Divisibility' :
                           field === 'premine' ? 'Premine' :
                           field === 'mintAmount' ? 'Mint Amount' :
                           field === 'mintCap' ? 'Mint Cap' : field;
          return `• ${fieldName}: ${error?.message || 'Required'}`;
        }).join('\n');
        
        alert(`⚠️ Please fix the following errors:\n\n${errorMessages}`);
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setUploadStage('Iniciando...');

      logger.info('Starting Rune creation with assets', {
        runeName: data.rune_name,
        symbol: data.symbol,
        divisibility: data.divisibility,
        premine: data.premine,
      });

      // Step 1: Validate image
      setUploadProgress(5);
      setUploadStage('Validando imagen...');
      if (selectedImage.size > 10 * 1024 * 1024) {
        throw new Error('La imagen es muy grande. Máximo 10MB');
      }

      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!validImageTypes.includes(selectedImage.type)) {
        throw new Error('Formato de imagen no válido. Usa JPEG, PNG, GIF, WebP o SVG');
      }

      // Step 2: Prepare metadata
      setUploadProgress(15);
      setUploadStage('Preparando metadata...');
      const metadata: Omit<RuneMetadata, 'image'> = {
        name: data.rune_name,
        symbol: data.symbol,
        description: data.description || `${data.rune_name} - A Bitcoin Rune created on QURI Protocol`,
        external_url: data.externalUrl || undefined,
        attributes: data.attributes?.filter(attr => attr.trait_type && attr.value) || [],
        properties: {
          supply: data.premine.toString(),
          divisibility: data.divisibility,
          creator: 'QURI Protocol',
          mint_amount: data.mintAmount?.toString(),
          mint_cap: data.mintCap?.toString(),
        },
      };

      // Step 3: Upload to IPFS
      setUploadProgress(25);
      setUploadStage('Subiendo imagen a IPFS...');
      logger.info('Uploading image to IPFS...');

      const { imageUpload, metadataUpload } = await uploadRuneAssets(
        selectedImage,
        metadata
      );

      setUploadProgress(60);
      setUploadStage('Metadata subida exitosamente');
      logger.info('Assets uploaded to IPFS successfully', {
        imageHash: imageUpload.ipfsHash,
        metadataHash: metadataUpload.ipfsHash,
        imageUrl: imageUpload.gatewayUrl,
        metadataUrl: metadataUpload.gatewayUrl,
      });

      setMetadataUrl(metadataUpload.gatewayUrl);

      // Step 4: Create Rune on Bitcoin using REAL ICP backend
      setUploadProgress(70);
      setUploadStage('Construyendo transacción Bitcoin...');
      logger.info('Creating Rune on Bitcoin via ICP backend...');

      // Get ICP agent and create actor for rune-engine canister
      const agent = await getAgent();
      const runeEngineId = process.env.NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID;
      
      if (!runeEngineId) {
        throw new Error('NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID not configured');
      }

      // Import IDL factory for rune-engine
      const { idlFactory } = await import('@/lib/integrations/rune-engine.did');
      
      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: Principal.fromText(runeEngineId),
      }) as any;

      // Prepare etching data for ICP backend
      const etchingData = {
        rune_name: data.rune_name,
        symbol: data.symbol,
        divisibility: data.divisibility,
        premine: BigInt(data.premine),
        terms: data.mintAmount && data.mintCap ? [{
          amount: BigInt(data.mintAmount),
          cap: BigInt(data.mintCap),
          height_start: [],
          height_end: [],
          offset_start: [],
          offset_end: [],
        }] : [],
      };

      // First, check canister health
      logger.info('Checking canister health...');
      const healthStatus = await actor.health_check();
      
      if (!healthStatus.healthy) {
        let errorDetails = 'El backend de ICP no está completamente configurado:\n';
        if (!healthStatus.etching_config_initialized) {
          errorDetails += '- Configuración de etching no inicializada\n';
        }
        if (!healthStatus.bitcoin_integration_configured) {
          errorDetails += '- Canister de Bitcoin Integration no configurado\n';
        }
        if (!healthStatus.registry_configured) {
          errorDetails += '- Canister de Registry no configurado\n';
        }
        errorDetails += '\nPor favor contacta al administrador del sistema.';
        throw new Error(errorDetails);
      }

      logger.info('Calling create_rune on ICP', { etchingData });
      
      setUploadProgress(85);
      setUploadStage('Firmando con Threshold Schnorr...');
      
      // Call real ICP backend to create Rune on Bitcoin testnet
      const result = await actor.create_rune(etchingData);
      
      if ('Err' in result) {
        // Parse the error message to provide better user feedback
        const errorMsg = result.Err;
        
        if (errorMsg.includes('Canister configuration not set')) {
          throw new Error(
            'El canister no está configurado correctamente. ' +
            'Necesita configurar los IDs de Bitcoin Integration y Registry. ' +
            'Por favor contacta al administrador del sistema.'
          );
        } else if (errorMsg.includes('Insufficient')) {
          throw new Error(
            'Balance insuficiente para crear el Rune. ' +
            'Necesitas aproximadamente 20,000 sats (~$10-15 USD) en tu wallet.'
          );
        } else if (errorMsg.includes('UTXO')) {
          throw new Error(
            'No se pudieron seleccionar UTXOs suficientes. ' +
            'Asegúrate de tener fondos disponibles en tu wallet.'
          );
        } else {
          throw new Error(`Error al crear Rune: ${errorMsg}`);
        }
      }
      
      const etchingId = result.Ok;
      logger.info('Rune creation initiated', { etchingId });
      
      setUploadProgress(95);
      setUploadStage('Broadcasting a Bitcoin testnet...');
      
      // Wait for transaction to be broadcasted
      await new Promise(resolve => setTimeout(resolve, 2000));

      setUploadProgress(100);
      setUploadStage('¡Completado!');

      // Success - Rune created on Bitcoin testnet
      logger.info('Rune created successfully on Bitcoin testnet!', {
        etchingId,
        runeName: data.rune_name,
        metadataUrl: metadataUpload.gatewayUrl,
        imageUrl: imageUpload.gatewayUrl,
      });

      if (onSuccess) {
        onSuccess(etchingId, metadataUpload.gatewayUrl);
      }

      // Show success notification
      alert(
        `✨ ¡Rune Creado Exitosamente en Bitcoin Testnet!\n\n` +
        `📛 Nombre: ${data.rune_name}\n` +
        `🎫 Símbolo: ${data.symbol}\n` +
        `💎 Premine: ${data.premine.toLocaleString()} tokens\n` +
        `🆔 Etching ID: ${etchingId}\n\n` +
        `🖼️  Imagen IPFS: ${imageUpload.ipfsHash}\n` +
        `📄 Metadata IPFS: ${metadataUpload.ipfsHash}\n\n` +
        `⏳ Redirigiendo al Explorer para ver tu Rune...`
      );

      // Redirect to explorer after 2 seconds
      setTimeout(() => {
        window.location.href = `/explorer?new=${etchingId}`;
      }, 2000);

    } catch (error) {
      logger.error('Failed to create Rune', error instanceof Error ? error : undefined);
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Mostrar toast de error profesional
      showToast({
        type: 'error',
        title: 'Error al crear Rune',
        message: `${errorMessage}. Por favor intenta nuevamente o contacta soporte si el problema persiste.`,
        duration: 8000,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('');
    }
  };

  if (!isConnected) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="py-12 text-center space-y-6">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold-600">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold text-museum-black mb-2">
              Connect Your Wallet
            </h3>
            <p className="text-museum-dark-gray mb-6">
              You need to connect with Internet Identity to create Bitcoin Runes. Your wallet will be used to sign transactions and receive your premined tokens.
            </p>
            <Button 
              onClick={connect} 
              isLoading={isLoading}
              className="bg-museum-black hover:bg-museum-charcoal text-white px-8 py-3"
            >
              {isLoading ? 'Connecting...' : 'Connect with Internet Identity'}
            </Button>
          </div>
          
          <div className="border-t border-museum-light-gray pt-6 max-w-md mx-auto">
            <p className="text-sm text-museum-gray mb-3">What is Internet Identity?</p>
            <ul className="text-sm text-museum-dark-gray space-y-2 text-left">
              <li className="flex items-start gap-2">
                <span className="text-gold-500 mt-0.5">•</span>
                <span>Decentralized authentication system by DFINITY</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-500 mt-0.5">•</span>
                <span>No password needed - uses biometrics or security key</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold-500 mt-0.5">•</span>
                <span>Your identity, your control - fully private</span>
              </li>
            </ul>
          </div>
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
                    <label className="block text-sm font-medium text-museum-charcoal mb-2 flex items-center gap-2">
                      Rune Name *
                      <InfoTooltip
                        title="Nombre del Rune"
                        description="El nombre único de tu token en la blockchain de Bitcoin. Una vez creado, NO se puede cambiar."
                        examples={[
                          "UNCOMMON•GOODS (nombre real en Bitcoin)",
                          "QUANTUM•LEAP",
                          "HELLO•WORLD"
                        ]}
                        warning="Máximo 26 caracteres, solo letras A-Z. Usa • para separar palabras."
                      />
                    </label>
                    <Input
                      {...register('rune_name')}
                      placeholder="HOLA or QUANTUM•LEAP"
                      className="font-mono uppercase"
                      maxLength={26}
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        const value = target.value.toUpperCase().replace(/[^A-Z•]/g, '');
                        target.value = value;
                        setValue('rune_name', value, { shouldValidate: true });
                      }}
                    />
                    {errors.rune_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.rune_name.message}</p>
                    )}
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-museum-gray">
                        Solo letras MAYÚSCULAS (A-Z) y el separador especial •
                      </p>
                      <p className="text-xs text-blue-600 font-medium">
                        💡 Tip: Para escribir • presiona Alt+8 (Windows) o Option+8 (Mac)
                      </p>
                    </div>
                  </div>

                  {/* Symbol */}
                  <div>
                    <label className="block text-sm font-medium text-museum-charcoal mb-2 flex items-center gap-2">
                      Symbol (Optional)
                      <InfoTooltip
                        title="Currency Symbol (Optional)"
                        description="Single character shown after amounts. Leave empty to use default ¤"
                        examples={[
                          "🐸 for PEPE",
                          "₿ for Bitcoin-themed",
                          "$ for dollar-themed",
                          "Leave empty = uses ¤"
                        ]}
                      />
                    </label>
                    <Input
                      {...register('symbol')}
                      placeholder="Leave empty for ¤ (or use 🐸 ₿ $ etc.)"
                      className="font-mono text-xl text-center"
                      maxLength={2}
                    />
                    {errors.symbol && (
                      <p className="text-red-500 text-sm mt-1">{errors.symbol.message}</p>
                    )}
                    <p className="text-xs text-museum-gray mt-1">
                      Optional: 🐸 ₿ $ € (1 char) or leave empty for default
                    </p>
                  </div>

                  {/* Divisibility */}
                  <div>
                    <label className="block text-sm font-medium text-museum-charcoal mb-2 flex items-center gap-2">
                      Divisibility *
                      <InfoTooltip
                        title="Divisibilidad (Decimales)"
                        description="Cuántos decimales tendrá tu token. Determina la mínima unidad que se puede transferir."
                        examples={[
                          "8 decimales = como Bitcoin (0.00000001)",
                          "0 decimales = solo enteros (1, 2, 3...)",
                          "18 decimales = como Ethereum",
                          "Si pones 8 y tienes 1.5 tokens = 150,000,000 unidades base"
                        ]}
                        warning="Valor entre 0-18. Default: 8 (recomendado)"
                      />
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

                  {/* Supply Distribution - Clear Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Supply Configuration (Required)
                    </h4>
                    <p className="text-sm text-blue-800 mb-2">
                      You MUST choose at least one option:
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1 ml-4">
                      <li>• <strong>Premine Only</strong>: Fixed supply, you get all tokens (e.g., 21M like Bitcoin)</li>
                      <li>• <strong>Open Mint Only</strong>: Anyone can mint, no premine (e.g., community fair launch)</li>
                      <li>• <strong>Both</strong>: You get premine + others can mint more (hybrid model)</li>
                    </ul>
                  </div>

                  {/* Premine */}
                  <div>
                    <label className="block text-sm font-medium text-museum-charcoal mb-2 flex items-center gap-2">
                      Premine Amount
                      <InfoTooltip
                        title="Premine - Your Initial Allocation"
                        description="Tokens YOU receive immediately when creating the Rune. These go directly to your wallet."
                        examples={[
                          "Example 1: Premine 21,000,000 + No Mint = Fixed supply (like Bitcoin)",
                          "Example 2: Premine 1,000,000 + Mint allowed = You get 1M, others can mint more",
                          "Example 3: Premine 0 + Mint allowed = Fair launch, everyone mints equally"
                        ]}
                      />
                    </label>
                    <Input
                      type="number"
                      {...register('premine', { valueAsNumber: true })}
                      min={0}
                      defaultValue={0}
                      placeholder="0 (or your initial allocation, e.g., 1000000)"
                    />
                    {errors.premine && (
                      <p className="text-red-500 text-sm mt-1">{errors.premine.message}</p>
                    )}
                    <p className="text-xs text-museum-gray mt-1">
                      Leave at 0 for fair launch (no premine)
                    </p>
                  </div>
                </div>

                {/* Minting Terms */}
                <div className="border-t border-museum-light-gray pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-serif text-xl">Open Mint Configuration</h3>
                    <InfoTooltip
                      title="Open Mint - Public Minting"
                      description="Allow anyone to mint tokens after you create the Rune. BOTH fields required if using open mint."
                      examples={[
                        "Amount: 100, Cap: 1,000,000 = Each mint creates 100 tokens, max 10,000 mints total",
                        "Amount: 1, Cap: 21,000,000 = Each mint creates 1 token, max 21M mints",
                        "Leave BOTH empty if you want fixed supply (premine only)"
                      ]}
                    />
                  </div>
                  <p className="text-sm text-museum-gray mb-4">
                    Optional: Enable public minting. Total Supply = Premine + (Mint Amount × Number of Mints)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-museum-charcoal mb-2 flex items-center gap-2">
                        Amount Per Mint
                        <InfoTooltip
                          title="Amount Per Mint Transaction"
                          description="How many tokens are created in each mint transaction. This is the fixed amount each minter receives."
                          examples={[
                            "100 = Each person who mints gets 100 tokens",
                            "1 = Each mint creates 1 token (like Bitcoin mining)",
                            "Must be > 0 if using open mint"
                          ]}
                        />
                      </label>
                      <Input
                        type="number"
                        {...register('mintAmount', { valueAsNumber: true })}
                        min={1}
                        placeholder="Leave empty for no public mint"
                      />
                      {errors.mintAmount && (
                        <p className="text-red-500 text-sm mt-1">{errors.mintAmount.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-museum-charcoal mb-2 flex items-center gap-2">
                        Mint Cap (Max Total)
                        <InfoTooltip
                          title="Maximum Total Mintable Supply"
                          description="TOTAL number of tokens that can be minted publicly (not counting premine). Once reached, minting closes forever."
                          examples={[
                            "1,000,000 = Max 1M tokens can be minted publicly",
                            "With Amount=100 and Cap=1,000,000 → 10,000 mints possible",
                            "Total Supply = Premine + Mint Cap"
                          ]}
                        />
                      </label>
                      <Input
                        type="number"
                        {...register('mintCap', { valueAsNumber: true })}
                        min={1}
                        placeholder="Leave empty for no public mint"
                      />
                      {errors.mintCap && (
                        <p className="text-red-500 text-sm mt-1">{errors.mintCap.message}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Supply Calculator Display */}
                  {(() => {
                    const premine = Number(watch('premine')) || 0;
                    const mintAmount = Number(watch('mintAmount')) || 0;
                    const mintCap = Number(watch('mintCap')) || 0;
                    const hasPremine = premine > 0;
                    const hasMintTerms = mintAmount > 0 && mintCap > 0;
                    
                    if (!hasPremine && !hasMintTerms) return null;
                    
                    return (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900 mb-2">📊 Total Supply Calculation</h4>
                        <div className="text-sm text-green-800 space-y-1">
                          {hasPremine && (
                            <p>• Premine: <strong>{premine.toLocaleString()}</strong> tokens (yours)</p>
                          )}
                          {hasMintTerms && (
                            <>
                              <p>• Public Mint: <strong>{mintCap.toLocaleString()}</strong> tokens max</p>
                              <p className="text-xs ml-4">
                                ({mintAmount.toLocaleString()} per mint × {Math.floor(mintCap / mintAmount).toLocaleString()} mints possible)
                              </p>
                            </>
                          )}
                          <p className="font-bold pt-2 border-t border-green-300">
                            Maximum Total Supply: {(premine + mintCap).toLocaleString()} tokens
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ARTWORK & METADATA TAB */}
            {currentTab === 'metadata' && (
              <div className="space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-museum-charcoal mb-4 flex items-center gap-2">
                    Artwork * (Stored on IPFS)
                    <InfoTooltip
                      title="Artwork del Rune"
                      description="Logo o arte de tu Rune que se mostrará en wallets, exploradores y DEX. Se almacena permanentemente en IPFS (descentralizado)."
                      examples={[
                        "Formato: PNG, JPG, GIF",
                        "Tamaño recomendado: 500x500px mínimo",
                        "Similar a logos de NFTs en OpenSea"
                      ]}
                      warning="La imagen se sube a IPFS y es inmutable - asegúrate de que sea la correcta."
                    />
                  </label>
                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-museum-charcoal mb-2 flex items-center gap-2">
                    Description
                    <InfoTooltip
                      title="Descripción del Proyecto"
                      description="Describe tu Rune, su propósito y qué lo hace especial. Esta descripción aparecerá en exploradores y marketplaces."
                      examples={[
                        "QUANTUM•LEAP: El primer token de física cuántica en Bitcoin...",
                        "Respaldado por activos reales, utilidad de governance, etc."
                      ]}
                    />
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
                  <label className="block text-sm font-medium text-museum-charcoal mb-2 flex items-center gap-2">
                    External URL (Optional)
                    <InfoTooltip
                      title="Sitio Web del Proyecto"
                      description="Link a tu website, documentación o redes sociales. Los usuarios podrán hacer clic para aprender más sobre tu proyecto."
                      examples={[
                        "https://quantumleap.io",
                        "https://docs.tuproyecto.com",
                        "https://twitter.com/tuproyecto"
                      ]}
                    />
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
                      <p className="font-semibold mb-1 flex items-center gap-2">
                        Custom Attributes (Like OpenSea Traits)
                        <InfoTooltip
                          title="Atributos Personalizados"
                          description="Propiedades adicionales tipo NFT que describen características especiales de tu Rune. Similares a los traits de NFTs en OpenSea."
                          examples={[
                            "Rarity: Legendary (para indicar rareza)",
                            "Collection: Genesis (serie o colección)",
                            "Utility: Governance (función del token)",
                            "Backed by: Real Estate (respaldo)"
                          ]}
                        />
                      </p>
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



            {/* Removed redundant checklist - All info now in the button */}

            {/* Submit Button - ALWAYS VISIBLE AND PROMINENT */}
            <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-6 -mx-6 px-6 mt-8 z-10">
              <div className="max-w-2xl mx-auto space-y-3">
                {/* Progress Bar (when uploading) */}
                {isUploading && (
                  <div className="bg-white border-2 border-gold-400 rounded-xl p-4 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-museum-black">{uploadStage}</span>
                      <span className="text-gold-600 font-bold text-lg">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 h-4 rounded-full transition-all duration-500 ease-out shadow-lg"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-center text-museum-gray">
                      No cierres esta ventana...
                    </p>
                  </div>
                )}

                {/* SINGLE SMART BUTTON - Guides user through the entire flow */}
                <Button
                  type={isValid && selectedImage ? 'submit' : 'button'}
                  disabled={isUploading}
                  isLoading={isUploading}
                  onClick={(e) => {
                    // Smart button that guides the user
                    if (!selectedImage) {
                      e.preventDefault();
                      setCurrentTab('metadata');
                      showToast({
                        type: 'info',
                        title: 'Upload Image',
                        message: 'Drag an image or click to select',
                        duration: 3000,
                      });
                    }
                    // If has validation errors, the form will show them
                  }}
                  className={`
                    w-full py-8 text-2xl font-black rounded-xl shadow-2xl 
                    transform transition-all duration-200 
                    ${isValid && selectedImage && !isUploading
                      ? 'bg-gradient-to-r from-bitcoin-500 via-gold-500 to-bitcoin-600 hover:from-bitcoin-600 hover:via-gold-600 hover:to-bitcoin-700 text-white hover:scale-105 hover:shadow-gold-500/50 animate-pulse cursor-pointer'
                      : 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white hover:scale-[1.02] cursor-pointer'
                    }
                  `}
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-4">
                      <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Procesando {uploadProgress}%
                    </span>
                  ) : !selectedImage ? (
                    <span className="flex items-center justify-center gap-3">
                      <ImageIcon className="w-8 h-8" />
                      📸 UPLOAD IMAGE
                    </span>
                  ) : !isValid ? (
                    (() => {
                      // Show specific error in button with action hint
                      if (errors.rune_name) return '❌ Fix Rune Name';
                      if (errors.premine) return '❌ Fix Supply (Premine or Mint Terms)';
                      if (errors.mintAmount || errors.mintCap) return '❌ Fix Mint Terms (both Amount & Cap)';
                      if (errors.symbol) return '❌ Fix Symbol (1 character only)';
                      if (errors.divisibility) return '❌ Fix Divisibility';
                      return '❌ Fix Errors Above';
                    })()
                  ) : (
                    <span className="flex items-center justify-center gap-3">
                      🚀 CREATE RUNE ON BITCOIN
                    </span>
                  )}
                </Button>

                {/* Quick Status */}
                {isValid && selectedImage && !isUploading && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700">
                      ✅ Todo listo • Costo: ~20k sats (~$10-15 USD) • Tiempo: 1-2 min
                    </p>
                  </div>
                )}
              </div>
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
