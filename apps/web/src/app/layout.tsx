import type { Metadata, Viewport } from 'next';
// Fonts are bundled with the site (no download from Google at build time, which can fail).
import '@fontsource/el-messiri/arabic-500.css';
import '@fontsource/el-messiri/arabic-600.css';
import '@fontsource/el-messiri/arabic-700.css';
import '@fontsource/el-messiri/latin-500.css';
import '@fontsource/el-messiri/latin-600.css';
import '@fontsource/el-messiri/latin-700.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';
import '@fontsource/ibm-plex-sans-arabic/latin-500.css';
import '@fontsource/ibm-plex-sans-arabic/latin-600.css';
import '@fontsource/ibm-plex-sans-arabic/latin-700.css';
import './globals.css';
import { getLang } from '@/lib/lang';

export const metadata: Metadata = { title: 'niche-engine' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <head>
        {/* Product photos come from Supabase Storage: open that connection early. */}
        {process.env.SUPABASE_URL && <link rel="preconnect" href={new URL(process.env.SUPABASE_URL).origin} crossOrigin="" />}
      </head>
      <body>{children}</body>
    </html>
  );
}
