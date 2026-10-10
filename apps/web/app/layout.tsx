import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SiteShell } from '@/components/site-shell';
import { getPortfolioData } from '@/lib/portfolio-data';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export const metadata: Metadata = {
  title: { default: 'Safika Sultana | Data Scientist & Developer', template: '%s | Safika Sultana' },
  description: 'Explore Safika Sultana’s analytics, AI, and development portfolio, technologies, and public GitHub work.',
  icons: { icon: '/logo.png', apple: '/logo.png' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { content } = await getPortfolioData();
  const theme = content.settings?.theme;
  const fallback = theme === 'light' ? "'light'" : theme === 'system' ? "(matchMedia('(prefers-color-scheme:light)').matches?'light':'dark')" : "'dark'";
  const themeScript = `try{var t=localStorage.getItem('safika-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:${fallback}}catch(e){document.documentElement.dataset.theme=${fallback}}`;
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
