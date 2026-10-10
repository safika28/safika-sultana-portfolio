import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Menu } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { profileContact } from '@/lib/profile-contact';
import { navItems } from '@/lib/site-data';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className="min-h-screen bg-background text-primary">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" aria-label="Safika Sultana home" className="inline-flex shrink-0 items-center gap-3 rounded-full font-heading text-2xl tracking-[0.16em] text-primary transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background">
            <Image
              src="/logo.png"
              alt=""
              width={48}
              height={48}
              sizes="48px"
              priority
              className="h-12 w-12 rounded-full border border-accent/50 bg-surface object-cover shadow-[0_0_18px_rgba(16,185,129,0.15)]"
            />
            <span>SAFIKA</span>
          </Link>
          <nav className="hidden items-center gap-4 md:flex lg:gap-8">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-secondary transition hover:text-accent">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {profileContact.linkedInUrl && (
              <a
                href={profileContact.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-2 rounded-full border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent shadow-[0_0_18px_rgba(16,185,129,0.18)] transition hover:-translate-y-0.5 hover:bg-accent hover:text-background md:inline-flex"
              >
                Connect on LinkedIn
                <ArrowRight size={16} />
              </a>
            )}
            <button
              type="button"
              className="rounded-full border border-border bg-surface/70 p-2 text-secondary transition hover:border-accent hover:text-accent md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>
      {children}
      <SiteFooter />
    </div>
  );
}
