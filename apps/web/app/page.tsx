import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BarChart3, Mail, MapPin, Sparkles } from 'lucide-react';
import { SectionHeading } from '@/components/section-heading';
import { experience, insights, navItems, projects, skills, stats } from '@/lib/site-data';

export default function HomePage() {
  return (
    <main>
      <section className="container-shell pb-20 pt-10 md:pb-28 md:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-accent shadow-[0_0_18px_rgba(16,185,129,0.15)]">
              <Sparkles size={14} />
              Data analyst & developer
            </div>
            <h1 className="mt-6 max-w-3xl font-heading text-5xl leading-none text-primary md:text-7xl">
              Insightful analysis. Thoughtful product execution.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-secondary">
              I help teams turn decision-making into a disciplined operating system—combining analytics, product thinking, and polished execution to uncover what matters and move faster with confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="#work" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-hover px-5 py-3 text-sm font-medium text-background shadow-[0_0_30px_rgba(16,185,129,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_0_35px_rgba(16,185,129,0.4)]">
                Explore work
                <ArrowRight size={16} />
              </Link>
              <Link href="#contact" className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-5 py-3 text-sm font-medium text-primary transition hover:-translate-y-0.5 hover:border-accent hover:text-accent">
                Contact
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-5 text-sm text-secondary">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-3 py-2"><MapPin size={16} className="text-accent" /> Based in Dhaka, Bangladesh</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/5 px-3 py-2"><Mail size={16} className="text-accent" /> hello@safikasultana.dev</span>
            </div>
          </div>

          <div className="panel relative overflow-hidden p-4">
            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-[#0d211c] via-[#0a1d18] to-[#071a14] p-6 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-secondary">Portfolio snapshot</p>
                  <h3 className="mt-2 font-heading text-2xl text-primary">Operations Pulse</h3>
                </div>
                <div className="rounded-full bg-success/15 px-2 py-1 text-xs text-success">+18.6% QoQ</div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {stats.slice(0, 2).map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border bg-elevated/90 p-4 shadow-[0_0_18px_rgba(16,185,129,0.08)]">
                    <p className="text-3xl font-bold text-primary">{item.value}</p>
                    <p className="mt-2 text-sm text-secondary">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-border bg-background/70 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-secondary"><BarChart3 size={14} className="text-accent" /> Revenue signal</div>
                  <span className="text-xs text-success">Healthy</span>
                </div>
                <div className="mt-5 flex h-28 items-end gap-2">
                  {[35, 48, 62, 70, 81, 74, 90].map((bar, idx) => (
                    <span key={idx} className="w-full rounded-t-xl bg-gradient-to-t from-accent via-emerald-400 to-accent-hover shadow-[0_0_18px_rgba(16,185,129,0.25)]" style={{ height: `${bar}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell pb-20" id="about">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="panel p-8">
            <SectionHeading eyebrow="About" title="Data that informs decisions, not just reports." />
          </div>
          <div className="space-y-6 text-lg leading-8 text-secondary">
            <p>
              I work at the intersection of analysis, strategy, and product delivery—building trusted metrics, translating complexity into clarity, and helping teams focus on the levers that actually move outcomes.
            </p>
            <p>
              My work ranges from dashboard design and SQL modeling to experimentation support and KPI architecture. I believe good analytics should feel as intentional as the business decision it supports.
            </p>
          </div>
        </div>
      </section>

      <section className="container-shell pb-20" id="experience">
        <SectionHeading eyebrow="Experience" title="A track record of measurable clarity." description="Across product, operations, and reporting, I build systems that make performance easier to understand and act upon." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {experience.map((item) => (
            <article key={item.period} className="panel p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-accent">{item.period}</p>
              <h3 className="mt-4 text-2xl text-primary">{item.role}</h3>
              <p className="mt-2 text-sm uppercase tracking-[0.18em] text-secondary">{item.company}</p>
              <p className="mt-5 text-base leading-7 text-secondary">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-shell pb-20" id="work">
        <SectionHeading eyebrow="Selected work" title="Work shaped by business context and technical rigor." description="A blend of analytics, system thinking, and data-driven storytelling." />
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {projects.map((project) => (
            <article key={project.title} className="panel overflow-hidden">
              <div className="relative h-64 w-full">
                <Image src={project.image} alt={project.title} fill className="object-cover" />
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-border bg-elevated px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="mt-5 text-2xl text-primary">{project.title}</h3>
                <p className="mt-4 text-base leading-7 text-secondary">{project.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container-shell pb-20" id="insights">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading eyebrow="Insights" title="Writing that connects analysis to action." description="Short reflections on thoughtful measurement, better reporting, and decision systems that scale." />
          <div className="grid gap-5">
            {insights.map((item) => (
              <article key={item.title} className="panel p-6">
                <p className="text-xs uppercase tracking-[0.28em] text-accent">Article</p>
                <h3 className="mt-4 text-2xl text-primary">{item.title}</h3>
                <p className="mt-4 text-base leading-7 text-secondary">{item.excerpt}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell pb-24" id="contact">
        <div className="panel p-8 md:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-accent">Let’s connect</p>
              <h2 className="mt-4 font-heading text-4xl text-primary md:text-5xl">I build clarity for teams that need to make smarter decisions.</h2>
            </div>
            <div className="space-y-6">
              <p className="text-lg leading-8 text-secondary">
                Whether you need analytics leadership, dashboard systems, or product-facing insights, I can help shape a measurement strategy that stays useful as the business grows.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="mailto:hello@safikasultana.dev" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-background transition hover:bg-accent-hover">hello@safikasultana.dev</Link>
                <Link href="https://www.linkedin.com" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-primary transition hover:border-accent hover:text-accent">LinkedIn</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell pb-20">
        <div className="panel p-8">
          <SectionHeading eyebrow="Core capabilities" title="Technology and analysis tools that support decisions." />
          <div className="mt-8 flex flex-wrap gap-3">
            {skills.map((skill) => (
              <span key={skill} className="rounded-full border border-border bg-elevated px-3 py-2 text-sm text-secondary">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
