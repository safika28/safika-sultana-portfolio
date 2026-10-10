type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  compact?: boolean;
};

export function SectionHeading({ eyebrow, title, description, compact = false }: SectionHeadingProps) {
  return (
    <div style={{ maxWidth: '42rem' }}>
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
      <h2 className={compact ? 'mt-2 font-heading text-2xl text-primary md:text-3xl' : 'mt-4 font-heading text-3xl text-primary md:text-5xl'}>{title}</h2>
      {description ? <p className={compact ? 'mt-2 text-sm leading-6 text-secondary' : 'mt-4 text-base leading-7 text-secondary md:text-lg'}>{description}</p> : null}
    </div>
  );
}
