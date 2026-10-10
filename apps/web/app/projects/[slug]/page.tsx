import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight, ChevronDown, ExternalLink, GitFork, Github, Star } from 'lucide-react';
import { ProjectIcon, SkillIcon } from '@/components/content-icons';
import { formatRepositoryDate, getProjectTechnologies, sourceStatusLabel } from '@/lib/github-projects';
import { getPortfolioData } from '@/lib/portfolio-data';

type ProjectPageProps = { params: { slug: string } };

async function findProject(slug: string) {
  const { projects } = await getPortfolioData();
  return projects.find((project) => project.name.toLowerCase() === slug.toLowerCase());
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const project = await findProject(params.slug);
  return { title: project ? project.title : 'Project not found', description: project?.summary };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const project = await findProject(params.slug);
  if (!project) notFound();
  const technologies = getProjectTechnologies(project);
  const isPortfolio = project.name === 'safika-sultana-portfolio';
  const metrics = Object.entries(project.metrics ?? {}).filter(([key, value]) => key.trim() && (
    (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && value.trim())
  ));
  const evaluations = (project.evaluationMetrics ?? []).filter((metric) => Number.isFinite(metric.value) && metric.name.trim() && metric.dataset.trim() && metric.methodology.trim());
  const unpublished = project.sourceStatus === 'empty'
    ? 'This repository currently has no published files. Supporting documentation and results are awaiting publication.'
    : 'Supporting case-study documentation has not been verified. Consult the repository for the latest published work.';
  const sections = [
    { key: 'businessProblem', title: 'Business problem', body: project.summary },
    { key: 'dataset', title: 'Dataset information', body: isPortfolio ? 'This is a portfolio application rather than a published modeling dataset. Dataset sizes, variable counts, and data quality statistics are not applicable to the repository overview.' : `Dataset source, license, sample count, and variables have not been published in this portfolio. ${unpublished}` },
    { key: 'cleaning', title: 'Data cleaning process', body: isPortfolio ? 'No analytical data-cleaning study is documented for this application.' : `Cleaning steps, missing-value handling, and validation rules have not been documented here. ${unpublished}` },
    { key: 'eda', title: 'Exploratory analysis', body: isPortfolio ? 'The application presents portfolio information; an exploratory dataset analysis is not documented.' : `No verified exploratory analysis or dataset findings are available here. ${unpublished}` },
    { key: 'featureEngineering', title: 'Feature engineering', body: isPortfolio ? 'Feature engineering for a predictive model is not applicable to the published application overview.' : `No verified feature definitions or transformations are available here. ${unpublished}` },
    { key: 'modeling', title: 'Modeling methodology', body: isPortfolio ? 'This repository is a web application. No trained machine learning model has been verified.' : `Model selection, training procedure, and dataset splits have not been verified. ${unpublished}` },
    { key: 'evaluation', title: 'Model evaluation', body: metrics.length || evaluations.length ? 'Evaluation metrics from the published project record appear below. Interpret each measure alongside its dataset, split, and methodology.' : 'No verified evaluation metrics are available. Accuracy, F1, ROC-AUC, RMSE, and other model scores are intentionally omitted until a reproducible evaluation is published.' },
    { key: 'visualizations', title: 'Visualizations', body: isPortfolio ? 'Browse the live application for its portfolio and analytics interface. Repository metadata charts describe public repository information rather than model results.' : `Project-specific charts or analytical reports have not been verified. ${unpublished}` },
    { key: 'impact', title: 'Business impact and limitations', body: 'Repository scope describes the intended business area. Measured outcomes, deployed adoption, and validated business impact have not been documented here. A public repository alone is not evidence of a completed analysis or model.' },
    { key: 'architecture', title: 'Deployment architecture', body: isPortfolio ? 'The published portfolio source includes a Next.js and TypeScript frontend, a NestJS API, and database migration examples. Runtime service configuration should be checked against the original repository; examples do not establish active production integrations.' : `Deployment architecture has not been verified. ${unpublished}` },
  ];

  return <main className="dashboard-page space-y-4">
    <Link href="/projects" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-xs text-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><ArrowLeft size={15} aria-hidden="true" />Back to projects</Link>
    <header className="panel space-y-3 p-4">
      <div className="flex items-start gap-3">{project.imageUrl ? <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-background"><Image src={project.imageUrl} alt={`${project.title} preview`} fill sizes="64px" unoptimized={project.imageUrl.startsWith('http')} className="object-cover" /></div> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent"><ProjectIcon name={project.name} size={24} /></span>}<div className="min-w-0"><p className="eyebrow">{project.category ?? 'Public repository'}</p><h1 className="mt-1 break-words text-xl font-semibold leading-7 text-primary sm:text-2xl">{project.title}</h1></div></div>
      <p className="text-sm leading-6 text-secondary">{project.summary}</p>
      <div className="flex flex-wrap gap-1.5"><span className="chip text-[11px]">{sourceStatusLabel(project)}</span>{project.status ? <span className="chip text-[11px]">{project.status}</span> : null}{technologies.map((technology) => <span key={technology} className="chip inline-flex items-center gap-1 text-[11px]"><SkillIcon label={technology} size={12} />{technology}</span>)}</div>
      <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs sm:grid-cols-4">
        <div><p className="text-secondary">Updated</p><p className="mt-1 text-primary">{formatRepositoryDate(project.updatedAt)}</p></div><div><p className="text-secondary">Source footprint</p><p className="mt-1 text-primary">{project.size == null ? 'Unavailable' : `${project.size.toLocaleString('en-US')} KiB`}</p></div><div><p className="inline-flex items-center gap-1 text-secondary"><Star size={12} aria-hidden="true" />Stars</p><p className="mt-1 text-primary">{project.stars ?? 'Unavailable'}</p></div><div><p className="inline-flex items-center gap-1 text-secondary"><GitFork size={12} aria-hidden="true" />Forks</p><p className="mt-1 text-primary">{project.forks ?? 'Unavailable'}</p></div>
      </div>
    </header>
    <p className="text-xs leading-5 text-secondary">Case-study sections distinguish repository scope from verified evidence. Unpublished datasets, methods, and metrics are shown explicitly.</p>
    <section className="panel overflow-hidden" aria-label="Project case study">
      {sections.map((section, index) => (
        <details key={section.title} open={index === 0} className="border-b border-border last:border-b-0">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"><span><span className="mr-2 font-mono text-[11px] text-accent">{String(index + 1).padStart(2, '0')}</span>{section.title}</span><ChevronDown size={15} className="shrink-0 text-secondary" aria-hidden="true" /></summary>
          <div className="space-y-3 border-t border-border/60 bg-background/30 px-4 py-3 text-[13px] leading-6 text-secondary">
            {section.key === 'visualizations' && project.visualizations?.length ? (
              <div className="space-y-3">
                {project.visualizations.map((visualization, visualizationIndex) => <figure key={`${visualization.title}-${visualizationIndex}`} className="space-y-2 rounded-xl border border-border bg-surface p-3"><figcaption><h3 className="break-words text-sm font-semibold text-primary">{visualization.title}</h3>{visualization.description && <p className="mt-1 whitespace-pre-line break-words text-xs leading-5 text-secondary">{visualization.description}</p>}</figcaption>{visualization.imageUrl ? <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-background"><Image src={visualization.imageUrl} alt={visualization.description ? `${visualization.title}: ${visualization.description}` : visualization.title} fill sizes="(max-width:639px) calc(100vw - 80px), (max-width:1023px) calc(100vw - 96px), 900px" unoptimized={visualization.imageUrl.startsWith('http')} className="object-contain" /></div> : null}{visualization.sourceUrl ? <a href={visualization.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-xs text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">View visualization source<ArrowUpRight size={13} aria-hidden="true" /></a> : null}</figure>)}
              </div>
            ) : <p className="whitespace-pre-line">{project.caseStudy?.[section.key]?.trim() || section.body}</p>}
            {section.key === 'impact' && project.caseStudy?.limitations ? <p className="whitespace-pre-line"><span className="font-medium text-primary">Limitations: </span>{project.caseStudy.limitations}</p> : null}
            {section.key === 'evaluation' && evaluations.length ? (
              <dl className="grid gap-2 sm:grid-cols-2">
                {evaluations.map((metric, metricIndex) => <div key={`${metric.name}-${metricIndex}`} className="rounded-xl border border-border bg-surface p-3"><dt className="text-xs text-secondary">{metric.name}</dt><dd className="mt-1 text-lg font-semibold text-accent">{metric.value}{metric.unit ? ` ${metric.unit}` : ''}</dd><dd className="mt-2 space-y-1 text-xs leading-5 text-secondary"><p><span className="font-medium text-primary">Dataset: </span>{metric.dataset}</p><p><span className="font-medium text-primary">Method: </span>{metric.methodology}</p></dd></div>)}
              </dl>
            ) : section.key === 'evaluation' && metrics.length ? (
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-surface p-3"><dt className="break-words text-xs text-secondary">{label.replace(/[_-]/g, ' ')}</dt><dd className="mt-1 break-words text-base font-semibold text-accent">{value}</dd></div>)}</dl>
            ) : null}
          </div>
        </details>
      ))}
      <details className="border-b border-border"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"><span><span className="mr-2 font-mono text-[11px] text-accent">11</span>GitHub repository</span><ChevronDown size={15} className="text-secondary" aria-hidden="true" /></summary><div className="space-y-2 border-t border-border/60 bg-background/30 px-4 py-3">{project.url ? <><p className="text-xs leading-5 text-secondary">Original source and documentation, maintained on GitHub.</p><a href={project.url} target="_blank" rel="noopener noreferrer" className="button-secondary inline-flex min-h-11 items-center gap-2 px-3 text-xs"><Github size={15} aria-hidden="true" />Open repository<ArrowUpRight size={13} aria-hidden="true" /></a></> : <p className="text-xs leading-5 text-secondary">A public GitHub repository has not been linked to this project.</p>}</div></details>
      <details><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"><span><span className="mr-2 font-mono text-[11px] text-accent">12</span>Live application</span><ChevronDown size={15} className="text-secondary" aria-hidden="true" /></summary><div className="border-t border-border/60 bg-background/30 px-4 py-3">{project.homepage ? <a href={project.homepage} target="_blank" rel="noopener noreferrer" className="button-primary inline-flex min-h-11 items-center gap-2 px-3 text-xs"><ExternalLink size={15} aria-hidden="true" />Open live application</a> : <p className="text-xs leading-5 text-secondary">A live application URL has not been published for this repository.</p>}</div></details>
    </section>
  </main>;
}
