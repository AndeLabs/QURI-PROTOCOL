import { redirect } from 'next/navigation';

/**
 * Gallery page is now unified with Explorer
 * 
 * All Runes (whether created by QURI or others) are native Bitcoin Runes.
 * There's no difference between them, so we show everything in one place.
 * 
 * Redirecting to /explorer for unified experience.
 */
export default function GalleryPage() {
  redirect('/explorer');
}
