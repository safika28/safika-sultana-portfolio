import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Github, Linkedin, Mail, MapPin } from 'lucide-react';
import { getPortfolioData } from '@/lib/portfolio-data';

export const metadata: Metadata = { title: 'About', description: 'Meet Safika Sultana, a data scientist and developer based in Electronic City, Bengaluru.' };

export default async function AboutPage() {
  const { profile, content } = await getPortfolioData();
  return (
    <main className="dashboard-page space-y-4">
      <header><p className="eyebrow">The person behind the portfolio</p><h1 className="dashboard-heading">About Safika</h1></header>
      <section className="panel p-3 sm:p-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Image src="/logo.png" alt={`${profile.name} portrait`} width={104} height={104} className="h-20 w-20 shrink-0 rounded-xl border border-border bg-elevated object-cover sm:h-[104px] sm:w-[104px]" />
          <div className="min-w-0"><h2 className="break-words text-xl font-semibold leading-tight text-primary sm:text-2xl">{profile.name}</h2><p className="mt-1 break-words text-sm text-accent">{profile.title}</p>{profile.location && <p className="mt-2 flex items-start gap-1.5 text-xs text-secondary"><MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{profile.location}</span></p>}</div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-primary">{profile.bio}</p>
        {profile.about && <p className="mt-2 max-w-3xl whitespace-pre-line break-words text-[13px] leading-6 text-secondary">{profile.about}</p>}
        {profile.availability && <p className="mt-3 inline-flex items-center gap-2 text-xs text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />{profile.availability}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/projects" className="button-primary inline-flex min-h-11 items-center gap-1.5">View projects<ArrowUpRight size={14} aria-hidden="true" /></Link>
          <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="button-secondary inline-flex min-h-11 items-center gap-1.5"><Github size={15} aria-hidden="true" />GitHub</a>
          {profile.linkedInUrl && <a href={profile.linkedInUrl} target="_blank" rel="noopener noreferrer" className="button-secondary inline-flex min-h-11 items-center gap-1.5"><Linkedin size={15} aria-hidden="true" />LinkedIn</a>}
          <a href={`mailto:${profile.email}`} className="button-secondary inline-flex min-h-11 items-center gap-1.5"><Mail size={15} aria-hidden="true" />Email</a>
        </div>
      </section>
      <section className="grid gap-2 sm:grid-cols-3" aria-label="Further information">
        {[{ title: 'Experience', href: '/experience', description: content.experience.length ? 'Professional roles and responsibilities.' : 'Starting my professional journey.' }, { title: 'Education', href: '/education', description: 'Published qualifications and academic records.' }, { title: 'Certifications', href: '/certifications', description: 'Published credentials and verification links.' }].map((item) => <Link key={item.href} href={item.href} className="panel min-h-11 p-3 transition-colors hover:border-accent/50"><h2 className="flex items-center justify-between gap-2 text-sm font-semibold text-primary">{item.title}<ArrowUpRight size={14} className="text-accent" aria-hidden="true" /></h2><p className="mt-1 text-xs leading-5 text-secondary">{item.description}</p></Link>)}
      </section>
    </main>
  );
}
