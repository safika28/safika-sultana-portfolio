import { ArrowRight, ArrowUpRight, ExternalLink, Github, Sparkles } from 'lucide-react';
import { CardCarousel } from '@/components/card-carousel';
import { ProjectIcon, SkillIcon } from '@/components/content-icons';
import { SectionHeading } from '@/components/section-heading';
import { GITHUB_PROFILE_URL, getGitHubProjects, type GitHubProject } from '@/lib/github-projects';
import { profileContact } from '@/lib/profile-contact';

export async function GitHubProjects() {
  const projects = await getGitHubProjects();
  return <GitHubProjectCards projects={projects} />;
}

export function GitHubProjectCards({ projects }: { projects: GitHubProject[] }) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading compact eyebrow="Selected work" title="Projects from GitHub." description={`${projects.length} public repositories in analytics and development.`} />
        <a href={GITHUB_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border px-3 py-2 text-xs text-secondary transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Github size={15} aria-hidden="true" /> View GitHub profile <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
      <CardCarousel label="Selected work">
        {projects.map((project, index) => (
          <article key={project.name} data-repository={project.name} className="panel flex flex-col overflow-hidden rounded-2xl">
            <div className="flex h-24 items-center justify-between border-b border-border bg-gradient-to-br from-accent/15 via-elevated to-background px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-background/50 text-accent">
                  <ProjectIcon name={project.name} size={24} />
                </div>
                <span className="text-[10px] uppercase leading-5 tracking-[0.12em] text-secondary">GitHub<br />repository</span>
              </div>
              <span className="font-mono text-xl text-accent/70" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-2 py-1 text-[9px] uppercase tracking-[0.08em] text-secondary">
                    <SkillIcon label={tag} size={11} className="text-accent" />
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="mt-3 text-lg leading-6 text-primary">
                <a href={project.url} target="_blank" rel="noopener noreferrer" className="rounded-sm hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{project.title}</a>
              </h3>
              <p className="mt-2 text-xs leading-5 text-secondary">{project.summary}</p>
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                <a href={project.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  View repository <ArrowUpRight size={14} aria-hidden="true" />
                  <span className="sr-only">: {project.title}</span>
                </a>
                {project.homepage ? (
                  <a href={project.homepage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-sm text-xs text-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    Live site <ExternalLink size={12} aria-hidden="true" />
                    <span className="sr-only">: {project.title}</span>
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        <article className="panel flex flex-col justify-center rounded-2xl border-accent/40 bg-accent/5 p-5">
          <Sparkles size={24} className="text-accent" aria-hidden="true" />
          <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-accent">Your next project</p>
          <h3 className="mt-3 text-lg leading-6 text-primary">Let’s work together</h3>
          <p className="mt-3 text-xs leading-5 text-secondary">Need a dashboard, sharper metrics, or actionable insights? Let’s build something useful.</p>
          {profileContact.linkedInUrl ? (
            <a href={profileContact.linkedInUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 self-start rounded-full border border-accent/50 px-3 py-2 text-xs font-medium text-accent transition hover:bg-accent hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              Connect on LinkedIn <ArrowRight size={14} aria-hidden="true" />
            </a>
          ) : null}
        </article>
      </CardCarousel>
    </>
  );
}
