'use client';

import Link from 'next/link';
import { Button } from './ui/Button';
import { TutorialButton } from './OnboardingTutorial';
import { useICP } from '@/lib/icp/ICPProvider';
import { Sparkles, ArrowRight, Shield, Zap } from 'lucide-react';

/**
 * Museum-Grade Hero Component
 * Minimalist design inspired by Foundation.app and MoMA
 * Emphasizes art, elegance, and white space
 */
export function Hero() {
  const { isConnected, connect, disconnect, principal, isLoading } = useICP();

  const handleAuthClick = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  return (
    <div className="relative bg-museum-white">
      {/* Minimalist Header Navigation */}
      <nav className="border-b border-museum-light-gray bg-museum-white">
        <div className="max-w-screen-2xl mx-auto px-8 py-6 lg:px-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-gold-500" />
              <span className="font-serif text-xl font-bold text-museum-black">QURI</span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/gallery"
                className="text-museum-dark-gray hover:text-museum-black transition-colors text-sm font-medium"
              >
                Gallery
              </Link>
              <TutorialButton />
              <Button
                size="sm"
                onClick={handleAuthClick}
                isLoading={isLoading}
                className="bg-museum-charcoal hover:bg-museum-black text-museum-white"
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          </div>

          {/* Connected Status - Subtle */}
          {isConnected && principal && (
            <div className="mt-4 flex items-center justify-end gap-2 text-xs text-museum-dark-gray">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-mono">
                {principal.toText().slice(0, 8)}...{principal.toText().slice(-6)}
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - Museum Gallery Entrance Style */}
      <header className="relative min-h-[70vh] flex items-center">
        {/* Background Gradient - Subtle */}
        <div className="absolute inset-0 bg-gradient-to-b from-museum-cream via-museum-white to-museum-white opacity-50" />

        <div className="relative z-10 max-w-screen-2xl mx-auto px-8 py-24 lg:px-16 lg:py-32 w-full">
          <div className="max-w-4xl">
            {/* Small Label - Gallery Style */}
            <div className="mb-8 inline-flex items-center gap-2 text-museum-dark-gray text-sm tracking-wider uppercase">
              <div className="w-8 h-px bg-gold-400" />
              <span>Bitcoin Runes Atelier</span>
            </div>

            {/* Main Title - Museum Wall Text Style */}
            <h1 className="font-serif text-6xl lg:text-7xl xl:text-8xl font-bold text-museum-black mb-8 tracking-tight leading-[1.1]">
              Create Digital<br />
              Artifacts on<br />
              Bitcoin
            </h1>

            {/* Subtitle - Elegant and Spacious */}
            <p className="text-xl lg:text-2xl text-museum-charcoal mb-12 max-w-2xl leading-relaxed">
              QURI is a professional launchpad for Bitcoin Runes — digital art pieces
              etched permanently onto the world&apos;s most secure blockchain.
            </p>

            {/* CTA Buttons - Minimal Style */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={handleAuthClick}
                isLoading={isLoading}
                className="bg-museum-black hover:bg-museum-charcoal text-museum-white px-8 py-4 text-lg group"
              >
                {isConnected ? 'Create Your Rune' : 'Get Started'}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Link href="/gallery">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-museum-charcoal text-museum-charcoal hover:bg-museum-charcoal hover:text-museum-white px-8 py-4 text-lg"
                >
                  View Gallery
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Element - Subtle Gold Line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-30" />
      </header>

      {/* Features Section - Minimal Cards */}
      <section className="border-t border-museum-light-gray bg-museum-cream">
        <div className="max-w-screen-2xl mx-auto px-8 py-16 lg:px-16 lg:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
            {/* Feature 1 */}
            <article className="group">
              <div className="mb-6">
                <div className="w-12 h-12 bg-museum-white border border-museum-light-gray flex items-center justify-center group-hover:border-gold-400 transition-colors duration-300">
                  <Shield className="w-6 h-6 text-museum-charcoal" />
                </div>
              </div>
              <h3 className="font-serif text-2xl font-bold text-museum-black mb-3">
                Museum-Grade Security
              </h3>
              <p className="text-museum-dark-gray leading-relaxed">
                Threshold Schnorr signatures ensure your Runes are created with
                enterprise-level cryptographic security.
              </p>
            </article>

            {/* Feature 2 */}
            <article className="group">
              <div className="mb-6">
                <div className="w-12 h-12 bg-museum-white border border-museum-light-gray flex items-center justify-center group-hover:border-gold-400 transition-colors duration-300">
                  <Sparkles className="w-6 h-6 text-museum-charcoal" />
                </div>
              </div>
              <h3 className="font-serif text-2xl font-bold text-museum-black mb-3">
                Zero Platform Fees
              </h3>
              <p className="text-museum-dark-gray leading-relaxed">
                Pay only Bitcoin network fees. No hidden costs, no platform cuts.
                Your art, your value.
              </p>
            </article>

            {/* Feature 3 */}
            <article className="group">
              <div className="mb-6">
                <div className="w-12 h-12 bg-museum-white border border-museum-light-gray flex items-center justify-center group-hover:border-gold-400 transition-colors duration-300">
                  <Zap className="w-6 h-6 text-museum-charcoal" />
                </div>
              </div>
              <h3 className="font-serif text-2xl font-bold text-museum-black mb-3">
                Instant Creation
              </h3>
              <p className="text-museum-dark-gray leading-relaxed">
                Create and deploy your Runes in minutes with our intuitive,
                production-ready interface.
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
