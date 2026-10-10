import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, ArrowUpRight, Github, Linkedin } from 'lucide-react';
import { GITHUB_PROFILE_URL } from '@/lib/github-projects';
import { profileContact } from '@/lib/profile-contact';
import { navItems } from '@/lib/site-data';

const footerLinkClass =
  'inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-secondary transition hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background';

export function SiteFooter() {
  return (
    <footer id="footer" className="border-t border-border/80 bg-surface/30">
      <div className="container-shell">
        <div className="grid grid-cols-2 gap-9 py-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-12 md:py-12">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              aria-label="Safika Sultana home"
              className="inline-flex min-h-12 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              <Image
                src="/logo.png"
                alt=""
                width={48}
                height={48}
                sizes="48px"
                className="h-12 w-12 rounded-full border border-accent/40 bg-surface object-cover"
              />
              <span>
                <span className="block font-heading text-xl text-primary">Safika Sultana</span>
                <span className="mt-1 block text-xs text-secondary">Data analyst &amp; developer</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Turning data into clear decisions and thoughtful digital experiences.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <h2 className="mb-2 font-body text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Explore
            </h2>
            <ul>
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={`/${item.href}`} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Social profiles">
            <h2 className="mb-2 font-body text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Find me
            </h2>
            <ul>
              <li>
                <a
                  href={GITHUB_PROFILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Safika Sultana on GitHub (opens in a new tab)"
                  className={footerLinkClass}
                >
                  <Github size={17} aria-hidden="true" />
                  GitHub
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </li>
              {profileContact.linkedInUrl && (
                <li>
                  <a
                    href={profileContact.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Safika Sultana on LinkedIn (opens in a new tab)"
                    className={footerLinkClass}
                  >
                    <Linkedin size={17} aria-hidden="true" />
                    LinkedIn
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                </li>
              )}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed">
            © {new Date().getFullYear()} Safika Sultana. All rights reserved.
          </p>
          <a href="#top" className={footerLinkClass}>
            Back to top
            <ArrowUp size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
