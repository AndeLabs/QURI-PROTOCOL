import { Metadata } from 'next';
import { RuneGallery } from '@/components/RuneGallery';

export const metadata: Metadata = {
  title: 'Gallery | QURI Protocol - Bitcoin Runes Collection',
  description: 'Explore the finest Bitcoin Runes - a curated collection of digital art on the Bitcoin blockchain',
  openGraph: {
    title: 'Gallery | QURI Protocol',
    description: 'Explore the finest Bitcoin Runes collection',
    type: 'website',
  },
};

/**
 * Museum-style Gallery Page
 * Showcases Bitcoin Runes as premium digital art pieces
 */
export default function GalleryPage() {
  return (
    <RuneGallery
      title="Runes Collection"
      subtitle="A curated selection of Bitcoin Runes - digital artifacts etched onto the world's most secure blockchain"
      showFilters={true}
    />
  );
}
