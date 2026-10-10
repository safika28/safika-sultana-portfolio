import Image from 'next/image';
import { Download, Linkedin } from 'lucide-react';

type PortraitCardProps = {
  photoUrl: string;
  name: string;
  linkedInUrl: string | null;
  cvUrl: string | null;
};

const actionClassName = 'portrait-glass-action';
const iconClassName = 'shrink-0';

export function PortraitCard({ photoUrl, name, linkedInUrl, cvUrl }: PortraitCardProps) {
  return (
    <div className="identity-photo">
      <Image
        src={photoUrl}
        alt={`Portrait of ${name}`}
        fill
        sizes="(min-width: 1024px) 200px, (min-width: 640px) 176px, 40vw"
        priority
        unoptimized={photoUrl.startsWith('http')}
      />
      <div className="identity-glass" role="group" aria-label="Profile links">
          {linkedInUrl ? (
            <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" aria-label={`${name} on LinkedIn (opens in a new tab)`} className={actionClassName}>
              <Linkedin className={iconClassName} aria-hidden="true" />
              <span>LinkedIn</span>
            </a>
          ) : (
            <button type="button" disabled aria-label="LinkedIn profile unavailable" className={actionClassName}>
              <Linkedin className={iconClassName} aria-hidden="true" />
              <span>LinkedIn</span>
            </button>
          )}
          {cvUrl ? (
            <a href={cvUrl} download aria-label={`Download ${name}'s CV`} className={actionClassName}>
              <Download className={iconClassName} aria-hidden="true" />
              <span>CV</span>
            </a>
          ) : (
            <button type="button" disabled aria-label="CV download unavailable" title="CV file has not been supplied" className={actionClassName}>
              <Download className={iconClassName} aria-hidden="true" />
              <span>CV</span>
            </button>
          )}
      </div>
    </div>
  );
}
