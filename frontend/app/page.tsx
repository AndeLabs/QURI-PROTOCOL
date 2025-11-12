'use client';

import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';

export default function Home() {
  return (
    <>
      <OnboardingTutorial onComplete={() => {}} onSkip={() => {}} />

      <main className="min-h-screen">
        <Hero />
        <Features />
      </main>
    </>
  );
}
