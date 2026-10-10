'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Activity, ArrowUpRight, BookOpen, BriefcaseBusiness, ChartNoAxesCombined, ChevronRight, Code2, Ellipsis, FolderGit2, GraduationCap, House, Mail, Moon, Search, ShieldCheck, Sun, UserRound, X } from 'lucide-react';
import { AuthStatus } from './auth-status';

const primary = [
  { href: '/', label: 'Home', icon: House }, { href: '/projects', label: 'Projects', icon: FolderGit2 },
  { href: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined }, { href: '/skills', label: 'Skills', icon: Code2 },
  { href: '/contact', label: 'Contact', icon: Mail },
];
const secondary = [
  { href: '/about', label: 'About', icon: UserRound }, { href: '/experience', label: 'Experience', icon: BriefcaseBusiness },
  { href: '/education', label: 'Education', icon: GraduationCap }, { href: '/certifications', label: 'Certifications', icon: ShieldCheck },
  { href: '/blog', label: 'Research & notes', icon: BookOpen },
];

export function DashboardShell({ children, footer, name, workspaceTitle, navigation, auth }: { children: ReactNode; footer: ReactNode; name: string; workspaceTitle:string; navigation: {label:string;href:string}[]; auth: {url:string|null; publicKey:string|null} }) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState('dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const current = [...primary, ...secondary].find((item) => item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
  const title = current?.label || (pathname.startsWith('/admin') ? 'Content studio' : pathname === '/login' ? 'Sign in' : pathname === '/register' ? 'Create account' : pathname === '/account' ? 'Account' : 'Workspace');
  const extraNavigation = navigation.filter((item) => ![...primary,...secondary].some((existing) => existing.href === item.href));

  useEffect(() => { setTheme(document.documentElement.dataset.theme || 'dark'); }, []);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    menu.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !menuButton.current?.contains(event.target as Node)) setMenuOpen(false); };
    window.addEventListener('keydown', close); window.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('keydown', close); window.removeEventListener('pointerdown', outside); };
  }, [menuOpen]);
  useEffect(() => {
    const viewport = window.visualViewport;
    let baseline = viewport?.height || window.innerHeight;
    const update = () => {
      const editing = document.activeElement?.matches('input,textarea,[contenteditable="true"]');
      const height = viewport?.height || window.innerHeight;
      if (!editing) baseline = height;
      setKeyboard(Boolean(editing && baseline - height > 150));
    };
    viewport?.addEventListener('resize', update); window.addEventListener('resize', update); document.addEventListener('focusin', update); document.addEventListener('focusout', update);
    return () => { viewport?.removeEventListener('resize', update); window.removeEventListener('resize', update); document.removeEventListener('focusin', update); document.removeEventListener('focusout', update); };
  }, []);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next; setTheme(next);
    try { localStorage.setItem('safika-theme', next); } catch { /* Private browsers may restrict storage. */ }
  }
  const active = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const brand = <><Image src="/logo.png" alt="" width={36} height={36} sizes="36px" className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover" /><span className="min-w-0"><strong className="block truncate text-[13px]">{name}</strong><span className="block truncate text-[11px] text-secondary">{workspaceTitle}</span></span></>;

  return <div id="top">
    <a href="#main-content" className="skip-link button-primary">Skip to content</a>
    <aside className="dashboard-sidebar" aria-label="Desktop workspace navigation">
      <Link href="/" className="flex min-h-[78px] items-center gap-2 border-b border-border px-4">{brand}</Link>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 px-2 text-[10px] uppercase tracking-widest text-secondary">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1">{primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-[13px] ${active(href) ? 'bg-accent/10 font-medium text-accent' : 'text-secondary hover:bg-elevated hover:text-primary'}`}><Icon size={17} aria-hidden="true" />{label}{active(href) && <ChevronRight size={14} className="ml-auto" aria-hidden="true" />}</Link>)}</nav>
        <p className="mb-2 mt-6 px-2 text-[10px] uppercase tracking-widest text-secondary">Profile</p>
        <nav aria-label="Profile navigation" className="space-y-1">{secondary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-[12px] ${active(href) ? 'bg-accent/10 text-accent' : 'text-secondary hover:bg-elevated hover:text-primary'}`}><Icon size={16} aria-hidden="true" />{label}</Link>)}</nav>
        {extraNavigation.length > 0 && <nav aria-label="Additional pages" className="mt-3 border-t border-border pt-2">{extraNavigation.map((item,index)=><Link key={`${item.href}-${index}`} href={item.href} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-secondary hover:bg-elevated"><ArrowUpRight size={15} aria-hidden="true" /><span className="min-w-0 break-words">{item.label}</span></Link>)}</nav>}
      </div>
      <div className="m-3 rounded-lg border border-border bg-background p-3"><Activity size={17} className="mb-2 text-accent" aria-hidden="true" /><p className="text-xs">From analysis to useful digital experiences.</p><Link href="/contact" className="mt-1 flex min-h-11 items-center gap-2 text-xs font-medium text-accent">Let’s work together<ArrowUpRight size={14} aria-hidden="true" /></Link></div>
    </aside>
    <div className="dashboard-body">
      <header className="dashboard-header">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-2"><Link href="/" aria-label={`${name} home`} className="flex min-h-11 w-11 items-center justify-center lg:hidden"><Image src="/logo.png" alt="" width={32} height={32} sizes="32px" className="h-8 w-8 rounded-lg border border-border object-cover" /></Link><div><p className="hidden text-[10px] text-secondary lg:block">Safika / workspace</p><span className="text-sm font-semibold">{title}</span></div></div>
          <div className="flex items-center gap-1.5">
            <AuthStatus {...auth} />
            <form className="relative hidden lg:block" role="search" onSubmit={(event) => { event.preventDefault(); const query = String(new FormData(event.currentTarget).get('q') || '').trim(); router.push(`/projects${query ? `?q=${encodeURIComponent(query)}` : ''}`); }}><Search size={14} aria-hidden="true" className="absolute left-3 top-[15px] text-secondary" /><input name="q" type="search" aria-label="Search portfolio projects" placeholder="Search projects…" maxLength={120} className="h-11 w-56 rounded-lg border border-border bg-surface pl-9 pr-3 text-xs" /></form>
            <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface">{theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>
            <div className="relative lg:hidden"><button ref={menuButton} type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="More profile pages" aria-expanded={menuOpen} aria-controls="secondary-navigation" className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface">{menuOpen ? <X size={19} aria-hidden="true" /> : <Ellipsis size={19} aria-hidden="true" />}</button>
              {menuOpen && <div ref={menu} id="secondary-navigation" className="absolute right-0 top-[51px] max-h-[65vh] w-60 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-xl"><nav aria-label="More profile pages">{secondary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-elevated"><Icon size={16} aria-hidden="true" />{label}</Link>)}{extraNavigation.map((item,index)=><Link key={`${item.href}-${index}`} href={item.href} onClick={()=>setMenuOpen(false)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-elevated"><ArrowUpRight size={16} aria-hidden="true" /><span className="min-w-0 break-words">{item.label}</span></Link>)}</nav></div>}
            </div>
          </div>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>{children}</div>
      {footer}
    </div>
    {!keyboard && <nav className="mobile-navigation" aria-label="Mobile navigation">{primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>)}</nav>}
  </div>;
}
