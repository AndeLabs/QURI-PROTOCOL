/**
 * Example Usage of Secure Pinata Integration
 *
 * This file demonstrates how to use the new secure Pinata integration
 * with the usePinata hook and API routes.
 */

'use client';

import { useState } from 'react';
import { usePinata, validateImageFile } from '@/hooks/usePinata';

/**
 * Example 1: Simple File Upload Component
 */
export function SimpleFileUpload() {
  const { uploadFile, isUploading, error } = usePinata();
  const [result, setResult] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    try {
      const uploadResult = await uploadFile(file);
      setResult(uploadResult.gatewayUrl);
      console.log('Upload successful:', uploadResult);
    } catch (err) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      {isUploading && <p>Uploading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {result && (
        <div>
          <p>Upload successful!</p>
          <img src={result} alt="Uploaded" style={{ maxWidth: '200px' }} />
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: File Upload with Progress Bar
 */
export function FileUploadWithProgress() {
  const { uploadFile, isUploading, error } = usePinata();
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProgress(0);
    setResult(null);

    try {
      const uploadResult = await uploadFile(file, (progressInfo) => {
        setProgress(progressInfo.percentage);
      });
      setResult(uploadResult.gatewayUrl);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {isUploading && (
        <div>
          <div
            style={{
              width: '100%',
              height: '20px',
              backgroundColor: '#e0e0e0',
              borderRadius: '10px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#4caf50',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <p>{progress}% uploaded</p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {result && <img src={result} alt="Uploaded" style={{ maxWidth: '200px' }} />}
    </div>
  );
}

/**
 * Example 3: Rune Creation Form (Full Example)
 */
export function RuneCreationForm() {
  const { uploadRuneAssets, isUploading, error, clearError } = usePinata();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    supply: '',
    divisibility: 8,
  });
  const [result, setResult] = useState<{
    imageHash: string;
    metadataHash: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      alert('Please select an image');
      return;
    }

    clearError();

    try {
      const { imageUpload, metadataUpload } = await uploadRuneAssets(imageFile, {
        name: formData.name,
        symbol: formData.symbol,
        description: formData.description,
        // image field will be filled automatically by uploadRuneAssets
        properties: {
          supply: formData.supply,
          divisibility: formData.divisibility,
          creator: 'user-principal-here', // Replace with actual principal
        },
      });

      setResult({
        imageHash: imageUpload.ipfsHash,
        metadataHash: metadataUpload.ipfsHash,
      });

      console.log('Rune assets uploaded successfully!');
      console.log('Image IPFS:', imageUpload.ipfsUrl);
      console.log('Metadata IPFS:', metadataUpload.ipfsUrl);
    } catch (err) {
      console.error('Failed to upload rune assets:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Rune Name:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label>Symbol:</label>
        <input
          type="text"
          value={formData.symbol}
          onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
          required
        />
      </div>

      <div>
        <label>Description:</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <label>Supply:</label>
        <input
          type="text"
          value={formData.supply}
          onChange={(e) => setFormData({ ...formData, supply: e.target.value })}
          required
        />
      </div>

      <div>
        <label>Divisibility:</label>
        <input
          type="number"
          value={formData.divisibility}
          onChange={(e) =>
            setFormData({ ...formData, divisibility: parseInt(e.target.value) })
          }
          min="0"
          max="18"
        />
      </div>

      <div>
        <label>Image:</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          required
        />
      </div>

      <button type="submit" disabled={isUploading}>
        {isUploading ? 'Uploading...' : 'Create Rune'}
      </button>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {result && (
        <div>
          <h3>Upload Successful!</h3>
          <p>Image IPFS Hash: {result.imageHash}</p>
          <p>Metadata IPFS Hash: {result.metadataHash}</p>
        </div>
      )}
    </form>
  );
}

/**
 * Example 4: Direct API Route Usage (Without Hook)
 */
export function DirectAPIUsage() {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/pinata/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();

      // Upload metadata
      const metadataResponse = await fetch('/api/pinata/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            name: 'My NFT',
            symbol: 'NFT',
            image: uploadResult.ipfsUrl,
            description: 'A cool NFT',
          },
        }),
      });

      if (!metadataResponse.ok) {
        const error = await metadataResponse.json();
        throw new Error(error.error || 'Metadata upload failed');
      }

      const metadataResult = await metadataResponse.json();
      setResult(metadataResult.gatewayUrl);

      console.log('Upload complete:', {
        image: uploadResult,
        metadata: metadataResult,
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        disabled={isUploading}
      />
      {isUploading && <p>Uploading...</p>}
      {result && (
        <div>
          <p>Success! Metadata URL:</p>
          <a href={result} target="_blank" rel="noopener noreferrer">
            {result}
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Error Handling
 */
export function ErrorHandlingExample() {
  const { uploadFile, error, clearError } = usePinata();

  const handleUpload = async (file: File) => {
    // Clear previous errors
    clearError();

    try {
      await uploadFile(file);
      // Success handling
    } catch (err) {
      // Error is automatically set in the hook
      // You can also handle it here
      console.error('Upload error:', err);
    }
  };

  return (
    <div>
      {/* Your upload UI */}
      {error && (
        <div style={{ color: 'red' }}>
          <p>Error: {error}</p>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

/**
 * Example 6: Legacy Code Migration
 */
export function LegacyCodeMigration() {
  // OLD WAY (still works, but deprecated):
  // import { uploadToPinata } from '@/lib/storage/pinata-storage';
  // const result = await uploadToPinata(file);

  // NEW WAY (recommended):
  const { uploadFile, isUploading, error } = usePinata();

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadFile(file);
      console.log('Uploaded:', result);
    } catch (err) {
      console.error('Upload failed:', error);
    }
  };

  return <div>{/* Your upload UI */}</div>;
}
