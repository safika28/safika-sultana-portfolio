import Link from 'next/link';
import { Award, BriefcaseBusiness, ExternalLink, FileText, GraduationCap } from 'lucide-react';

type TimelineType = 'experience' | 'education' | 'certifications';

function value(record: Record<string, unknown>, key: string) {
  return typeof record[key] === 'string' ? record[key].trim() : '';
}

function credentialUrl(record: Record<string, unknown>, key = 'credentialUrl') {
  const candidate = value(record, key);
  if (candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('\\')) return candidate;
  try {
    const url = new URL(candidate);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function TimelineRecords({ records, type }: { records: Record<string, unknown>[]; type: TimelineType }) {
  const Icon = type === 'experience' ? BriefcaseBusiness : type === 'education' ? GraduationCap : Award;
  const visible = records.filter((record) => value(record, 'title'));
  if (!visible.length) return (
    <section className="panel p-4 sm:p-5">
      <Icon size={22} className="text-accent" aria-hidden="true" />
      <h2 className="dashboard-heading mt-3">No published {type} records yet</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-secondary">Verified details will appear here when they are published. In the meantime, explore the portfolio’s public work or get in touch.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Link href="/projects" className="button-primary inline-flex min-h-11 items-center">Explore projects</Link><Link href="/contact" className="button-secondary inline-flex min-h-11 items-center">Get in touch</Link></div>
    </section>
  );
  return (
    <ol className="relative ml-2 space-y-3 border-l border-border pl-5" aria-label={`${type} timeline`}>
      {visible.map((record, index) => {
        const title = value(record, 'title');
        const organization = value(record, 'organization') || value(record, 'institution');
        const description = value(record, 'description');
        const dates = value(record, 'dates');
        const credential = credentialUrl(record);
        const document = credentialUrl(record, 'documentUrl');
        const tags = Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim())) : [];
        return (
          <li key={value(record, 'id') || `${title}-${index}`} className="panel relative min-w-0 p-3 sm:p-4">
            <span className="absolute -left-[26px] top-5 h-2.5 w-2.5 rounded-full border-2 border-background bg-accent" aria-hidden="true" />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0"><h2 className="break-words text-sm font-semibold leading-5 text-primary">{title}</h2>{organization && <p className="mt-1 break-words text-[13px] text-secondary">{organization}</p>}</div>
              {dates && <p className="min-w-0 break-words text-xs text-accent">{dates}</p>}
            </div>
            {description && <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-accent">{type === 'experience' ? 'Responsibilities & details' : 'More details'}</summary><p className="whitespace-pre-line break-words text-[13px] leading-6 text-secondary">{description}</p></details>}
            {tags.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Technologies"><li className="sr-only">Technologies applied</li>{tags.map((tag, tagIndex) => <li key={`${tag}-${tagIndex}`} className="chip max-w-full whitespace-normal break-words">{tag}</li>)}</ul>}
            <div className="mt-2 flex flex-wrap gap-3">{credential && <a href={credential} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-accent">Verify credential<ExternalLink size={13} aria-hidden="true" /></a>}{document && <a href={document} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-accent"><FileText size={14} aria-hidden="true" />View certificate PDF</a>}</div>
          </li>
        );
      })}
    </ol>
  );
}
