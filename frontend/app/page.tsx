import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { EtchingForm } from '@/components/EtchingForm';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <EtchingForm />
      </section>
    </main>
  );
}
