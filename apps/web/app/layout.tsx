import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SiteShell } from '@/components/site-shell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playFair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Safika Sultana | Data Analyst & Developer',
  description: 'Premium portfolio and content platform for Safika Sultana',
  metadataBase: new URL('https://example.com')
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playFair.variable} ${jetBrainsMono.variable}`}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
