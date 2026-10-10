import Link from 'next/link';
import { ArrowRight, Menu } from 'lucide-react';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-primary">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="font-heading text-2xl tracking-[0.16em] text-primary transition hover:text-accent">
            SAFIKA
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {['About', 'Experience', 'Work', 'Insights', 'Contact'].map((item) => (
              <Link key={item} href={`#${item.toLowerCase()}`} className="text-sm text-secondary transition hover:text-accent">
                {item}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="#contact"
              className="hidden items-center gap-2 rounded-full border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent shadow-[0_0_18px_rgba(16,185,129,0.18)] transition hover:-translate-y-0.5 hover:bg-accent hover:text-background md:inline-flex"
            >
              Book a conversation
              <ArrowRight size={16} />
            </Link>
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
    </div>
  );
}
