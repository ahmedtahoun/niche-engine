import type { Metadata, Viewport } from 'next';
import { El_Messiri, IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';

const display = El_Messiri({ subsets: ['arabic', 'latin'], weight: ['500', '600', '700'], variable: '--f-display', display: 'swap' });
const body = IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700'], variable: '--f-body', display: 'swap' });

export const metadata: Metadata = { title: 'niche-engine' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
