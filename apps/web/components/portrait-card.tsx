import Image from 'next/image';
import { Download, Linkedin } from 'lucide-react';

type PortraitCardProps = {
  linkedInUrl: string | null;
  cvUrl: string | null;
};

const actionClassName = 'portrait-glass-action';
const disabledActionClassName = 'portrait-glass-action portrait-glass-action-disabled';
const iconClassName = 'h-2.5 w-2.5 shrink-0 md:h-3 md:w-3';

export function PortraitCard({ linkedInUrl, cvUrl }: PortraitCardProps) {
  return (
    <div className="hero-portrait">
      <Image
        src="/home-portrait.png"
        alt="Safika Sultana in a black blazer and beige trousers"
        width={1024}
        height={1536}
        sizes="(min-width: 1280px) 320px, (min-width: 1024px) 288px, (min-width: 768px) 224px, calc(45vw - 27px)"
        priority
        className="hero-portrait-image"
      />
      <div className="portrait-glass-panel">
        <div className="portrait-glass-actions">
          {linkedInUrl ? (
            <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" aria-label="Safika Sultana on LinkedIn (opens in a new tab)" className={actionClassName}>
              <Linkedin className={iconClassName} aria-hidden="true" />
              LinkedIn
            </a>
          ) : (
            <button type="button" disabled aria-label="LinkedIn profile unavailable" className={disabledActionClassName}>
              <Linkedin className={iconClassName} aria-hidden="true" />
              LinkedIn
            </button>
          )}
          {cvUrl ? (
            <a href={cvUrl} download aria-label="Download Safika Sultana's CV" className={actionClassName}>
              <Download className={iconClassName} aria-hidden="true" />
              Download CV
            </a>
          ) : (
            <button type="button" disabled aria-label="CV download unavailable" className={disabledActionClassName}>
              <Download className={iconClassName} aria-hidden="true" />
              Download CV
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
