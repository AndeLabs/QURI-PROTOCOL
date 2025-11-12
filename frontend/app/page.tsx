'use client';

import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { EtchingForm } from '@/components/EtchingForm';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';

export default function Home() {
  return (
    <>
      <OnboardingTutorial onComplete={() => {}} onSkip={() => {}} />

      <main className="min-h-screen">
        <Hero />
        <Features />
        <section className="py-8 px-4 sm:py-12 sm:px-6 lg:py-16 lg:px-8 max-w-4xl mx-auto">
          <EtchingForm />
        </section>
      </main>
    </>
  );
}
