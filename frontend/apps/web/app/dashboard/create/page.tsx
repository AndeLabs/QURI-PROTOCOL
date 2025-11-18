'use client';

import { EnhancedEtchingForm } from '@/components/EnhancedEtchingForm';
import { Sparkles } from 'lucide-react';

export default function CreatePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          Create Bitcoin Rune
        </h1>
        <p className="text-museum-dark-gray">
          Etch your digital artifacts permanently onto the Bitcoin blockchain
        </p>
      </div>

      {/* Etching Form */}
      <div className="max-w-4xl mx-auto">
        <EnhancedEtchingForm />
      </div>

      {/* Info Section */}
      <div className="max-w-4xl mx-auto mt-8">
        <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
            Why Create Runes on QURI?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="rounded-lg bg-museum-cream p-3 w-12 h-12 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-gold-600" />
              </div>
              <h3 className="font-semibold text-museum-black mb-2">
                Zero Platform Fees
              </h3>
              <p className="text-sm text-museum-dark-gray">
                Pay only Bitcoin network fees. No hidden costs or platform cuts.
              </p>
            </div>
            <div>
              <div className="rounded-lg bg-museum-cream p-3 w-12 h-12 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-gold-600" />
              </div>
              <h3 className="font-semibold text-museum-black mb-2">
                Threshold Schnorr
              </h3>
              <p className="text-sm text-museum-dark-gray">
                Enterprise-grade security with ICP&apos;s threshold signatures.
              </p>
            </div>
            <div>
              <div className="rounded-lg bg-museum-cream p-3 w-12 h-12 flex items-center justify-center mb-3">
                <Sparkles className="h-6 w-6 text-gold-600" />
              </div>
              <h3 className="font-semibold text-museum-black mb-2">
                Instant Finality
              </h3>
              <p className="text-sm text-museum-dark-gray">
                2-second transaction confirmation via ICP canisters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
