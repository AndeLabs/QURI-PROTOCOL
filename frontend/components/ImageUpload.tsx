'use client';

import { useState, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { validateImageFile } from '@/lib/storage/ipfs';

/**
 * Museum-Grade Image Upload Component
 * Elegant drag-and-drop with preview for Rune artwork
 */

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  previewUrl?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  className?: string;
}

export function ImageUpload({
  onImageSelect,
  previewUrl,
  isUploading = false,
  uploadProgress = 0,
  className = '',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Notify parent
    onImageSelect(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
        onChange={handleChange}
      />

      {preview ? (
        /* Preview State */
        <div className="relative aspect-square bg-museum-cream border-2 border-museum-light-gray group">
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, 400px"
          />

          {/* Upload Progress Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-museum-black bg-opacity-80 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-gold-500 animate-spin mb-4" />
              <div className="w-2/3 h-2 bg-museum-charcoal rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-museum-white text-sm mt-4">Uploading to IPFS... {uploadProgress}%</p>
            </div>
          )}

          {/* Success Overlay */}
          {uploadProgress === 100 && (
            <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full">
              <CheckCircle className="w-5 h-5" />
            </div>
          )}

          {/* Remove Button */}
          {!isUploading && (
            <button
              onClick={handleRemove}
              className="
                absolute top-4 right-4
                p-2 bg-museum-black text-museum-white
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
                hover:bg-red-500
              "
              aria-label="Remove image"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Change Image Button */}
          {!isUploading && (
            <button
              onClick={handleClick}
              className="
                absolute bottom-4 left-1/2 -translate-x-1/2
                px-6 py-2
                bg-museum-white border border-museum-charcoal
                text-museum-charcoal text-sm
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
                hover:bg-museum-charcoal hover:text-museum-white
              "
            >
              Change Image
            </button>
          )}
        </div>
      ) : (
        /* Upload State */
        <div
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            aspect-square
            border-2 border-dashed
            flex flex-col items-center justify-center
            cursor-pointer
            transition-all duration-200
            ${
              dragActive
                ? 'border-gold-500 bg-gold-50'
                : 'border-museum-gray bg-museum-cream hover:border-museum-charcoal hover:bg-museum-light-gray'
            }
          `}
        >
          <div className="text-center p-8">
            {dragActive ? (
              <Upload className="w-16 h-16 mx-auto mb-4 text-gold-500" />
            ) : (
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-museum-gray" />
            )}

            <p className="text-museum-charcoal font-serif text-lg mb-2">
              {dragActive ? 'Drop your artwork here' : 'Upload Rune Artwork'}
            </p>

            <p className="text-museum-gray text-sm mb-4">
              Drag and drop or click to browse
            </p>

            <div className="text-xs text-museum-dark-gray space-y-1">
              <p>Supported formats: JPEG, PNG, GIF, WebP, SVG</p>
              <p>Maximum size: 10MB</p>
              <p>Recommended: Square images (1:1 ratio)</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* IPFS Info */}
      {preview && !isUploading && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm">
          <p className="font-semibold mb-1">📦 Decentralized Storage</p>
          <p className="text-xs">
            Your artwork will be uploaded to IPFS (InterPlanetary File System) for permanent,
            decentralized storage. This is the same system used by OpenSea and Foundation.app.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Image Upload for forms
 */
export function ImageUploadCompact({
  onImageSelect,
  previewUrl,
  className = '',
}: Omit<ImageUploadProps, 'isUploading' | 'uploadProgress'>) {
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateImageFile(file);

      if (validation.valid) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        onImageSelect(file);
      }
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleChange}
      />

      {preview ? (
        <div className="relative w-20 h-20 border border-museum-light-gray">
          <Image src={preview} alt="Preview" fill className="object-cover" sizes="80px" />
        </div>
      ) : (
        <div className="w-20 h-20 bg-museum-cream border border-museum-light-gray flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-museum-gray" />
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 bg-museum-white border border-museum-charcoal text-museum-charcoal text-sm hover:bg-museum-charcoal hover:text-museum-white transition-colors"
      >
        {preview ? 'Change' : 'Choose'} Image
      </button>
    </div>
  );
}
