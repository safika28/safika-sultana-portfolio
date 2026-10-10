import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, Github, Linkedin, Mail, Phone } from 'lucide-react';
import type { PortfolioProfile } from '@/lib/portfolio-data';
export function SiteFooter({ profile }: { profile: PortfolioProfile }) {
 return <footer className="mt-4 border-t border-border bg-surface/30"><div className="container-shell py-5">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <Link href="/" className="flex min-h-11 items-center gap-2"><Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg border border-border object-cover" /><span className="text-xs font-semibold">{profile.name}<span className="block font-normal text-secondary">{profile.location}</span></span></Link>
   <nav aria-label="Footer links" className="flex flex-wrap gap-4">{[['Projects','/projects'],['About','/about'],['Contact','/contact']].map(([label,href])=><Link key={href} href={href} className="flex min-h-11 items-center text-xs text-secondary hover:text-accent">{label}</Link>)}</nav>
   <div className="flex gap-1">{[{href:profile.githubUrl,label:'GitHub',Icon:Github},{href:profile.linkedInUrl,label:'LinkedIn',Icon:Linkedin},{href:`mailto:${profile.email}`,label:'Email',Icon:Mail},{href:profile.phoneHref,label:'Call',Icon:Phone}].map(({href,label,Icon})=>href&&<a key={label} href={href} aria-label={label} target={label==='GitHub'||label==='LinkedIn'?'_blank':undefined} rel={label==='GitHub'||label==='LinkedIn'?'noopener noreferrer':undefined} className="flex h-11 w-11 items-center justify-center rounded-lg text-secondary hover:bg-elevated hover:text-accent"><Icon size={16} aria-hidden="true" /></a>)}</div>
  </div>
  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2"><p className="text-[11px]">© {new Date().getFullYear()} {profile.name}</p><a href="#top" className="flex min-h-11 items-center gap-1 text-[11px] text-secondary">Back to top<ArrowUp size={13} aria-hidden="true" /></a></div>
 </div></footer>;
}
