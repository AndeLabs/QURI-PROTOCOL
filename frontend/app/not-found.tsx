import Link from 'next/link';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-museum-cream">
      <div className="text-center">
        <h1 className="font-serif text-6xl font-bold text-museum-black mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-museum-dark-gray mb-6">
          Page Not Found
        </h2>
        <p className="text-museum-gray mb-8">
          The page you are looking for does not exist.
        </p>
        <Link href="/">
          <ButtonPremium variant="gold" icon={<Home className="h-5 w-5" />}>
            Go Home
          </ButtonPremium>
        </Link>
      </div>
    </div>
  );
}
