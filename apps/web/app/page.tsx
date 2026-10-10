import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import { CardCarousel } from '@/components/card-carousel';
import { SkillIcon } from '@/components/content-icons';
import { GitHubProjectCards, GitHubProjects } from '@/components/github-projects';
import { PortraitCard } from '@/components/portrait-card';
import { SectionHeading } from '@/components/section-heading';
import { SkillsFrame } from '@/components/skills-frame';
import { githubProjectSnapshot } from '@/lib/github-projects';
import { profileContact } from '@/lib/profile-contact';
import { experience, skillGroups, skills } from '@/lib/site-data';

export default function HomePage() {
  return (
    <main>
      <section className="container-shell pb-12 pt-8 md:pb-16 md:pt-10">
        <div className="hero-layout grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)] items-stretch gap-x-3 gap-y-5 sm:gap-x-6 md:grid-cols-[minmax(0,1fr)_14rem] md:gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="hero-content contents md:flex md:min-h-[25rem] md:min-w-0 md:flex-col md:justify-between">
            <div className="col-span-2 md:col-span-1">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-accent shadow-[0_0_18px_rgba(16,185,129,0.15)] sm:text-xs sm:tracking-[0.3em]">
                <Sparkles size={14} className="shrink-0" />
                Data analyst & developer
              </div>
            </div>
            <div className="hero-copy flex min-h-[260px] min-w-0 flex-col justify-center md:min-h-0 md:flex-1">
              <h1 className="font-heading text-[clamp(1.0625rem,4.4vw,1.1875rem)] leading-snug text-primary md:mt-5 md:text-[clamp(1.125rem,2vw,1.75rem)] lg:whitespace-nowrap">
                Insightful analysis. Thoughtful product execution.
              </h1>
              <p className="mt-3 text-xs leading-5 text-secondary min-[375px]:text-[13px] md:text-sm md:leading-6">
                I turn data into clear decisions through analytics and thoughtful product execution.
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <div className="flex flex-wrap gap-3 md:mt-6">
                <Link href="#work" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-hover px-4 py-2.5 text-sm font-medium text-background shadow-[0_0_30px_rgba(16,185,129,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(16,185,129,0.4)]">
                  Explore work
                  <ArrowRight size={16} />
                </Link>
                <a href={profileContact.phoneHref} aria-label={`Call Safika Sultana at ${profileContact.phoneNumber}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-2.5 text-sm font-medium text-primary transition hover:-translate-y-0.5 hover:border-accent hover:text-accent">
                  <Phone size={14} aria-hidden="true" />
                  Contact
                </a>
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-secondary md:mt-6">
                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-white/5 px-3 py-1.5"><MapPin size={14} className="shrink-0 text-accent" aria-hidden="true" /><span className="min-w-0">Based in {profileContact.location}</span></span>
                <a href={`mailto:${profileContact.email}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-white/5 px-3 py-1.5 transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Mail size={14} className="shrink-0 text-accent" aria-hidden="true" /><span className="min-w-0 break-all">{profileContact.email}</span></a>
              </div>
            </div>
          </div>

          <div className="hero-portrait-wrapper col-start-2 row-start-2 min-w-0 self-stretch md:col-auto md:row-auto">
            <PortraitCard {...profileContact} />
          </div>
        </div>
      </section>

      <section className="container-shell scroll-mt-28 pb-12 md:pb-16" id="about">
        <div className="panel flex flex-col gap-5 p-6 sm:flex-row sm:items-center md:p-8">
          <Image src="/logo.png" alt="" width={80} height={80} sizes="80px" className="h-20 w-20 shrink-0 rounded-full border border-accent/50 bg-surface object-cover" />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">About</p>
            <h2 className="mt-2 font-heading text-xl text-primary md:text-2xl">Clear data. Better decisions.</h2>
            <p className="mt-2 text-sm leading-6 text-secondary">
              I build dashboards, trusted metrics, and practical insights that help teams act with confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="container-shell scroll-mt-28 pb-12 md:pb-16" id="experience">
        <SectionHeading compact eyebrow="Experience" title="A track record of measurable clarity." description="Analytics, reporting, and practical product thinking." />
        <CardCarousel label="Experience">
          {experience.map((item) => (
            <article key={item.period} className="panel rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-accent">{item.period}</p>
              <h3 className="mt-3 text-lg leading-6 text-primary">{item.role}</h3>
              <p className="mt-1 text-[11px] uppercase leading-5 tracking-[0.1em] text-secondary">{item.company}</p>
              <p className="mt-3 text-xs leading-5 text-secondary">{item.description}</p>
            </article>
          ))}
          <article className="panel rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-accent">Skills summary</p>
            <h3 className="mt-3 text-lg leading-6 text-primary">Tools behind the insights</h3>
            <p className="mt-3 text-xs leading-5 text-secondary">A practical toolkit for analysis, reporting, and clear data storytelling.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skills.slice(0, 5).map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-2 py-1 text-[10px] text-secondary">
                  <SkillIcon label={skill} size={12} className="text-accent" />
                  {skill}
                </span>
              ))}
            </div>
          </article>
        </CardCarousel>
      </section>

      <section className="container-shell scroll-mt-28 pb-12 md:pb-16" id="work">
        <Suspense fallback={<GitHubProjectCards projects={githubProjectSnapshot} />}>
          <GitHubProjects />
        </Suspense>
      </section>

      <section className="container-shell scroll-mt-28 pb-10 md:pb-12" id="skills">
        <SkillsFrame groups={skillGroups.map((group) => ({ title: group.title, count: group.skills.length }))}>
          {skillGroups.map((group) => (
            <div key={group.title} className="skills-chip-list">
              {group.skills.map((skill) => (
                <span key={skill} data-skill={skill} className="skill-chip">
                  <SkillIcon label={skill} size={12} className="mt-0.5 text-accent" />
                  <span className="min-w-0 break-words">{skill}</span>
                </span>
              ))}
            </div>
          ))}
        </SkillsFrame>
      </section>
    </main>
  );
}
