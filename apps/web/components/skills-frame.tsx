'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

type SkillsFrameProps = {
  groups: { title: string; count: number }[];
  children: ReactNode[];
};

const categoryLabels = [
  'Analytics',
  'Machine learning',
  'AI & deep learning',
  'Data engineering',
  'Web & design',
  'APIs & security',
  'Cloud & deployment'
];

export function SkillsFrame({ groups, children }: SkillsFrameProps) {
  const frameId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const totalSkills = groups.reduce((total, group) => total + group.count, 0);

  function activateTab(index: number, focus = false) {
    setSelectedIndex(index);
    const tab = tabRefs.current[index];
    if (focus) tab?.focus({ preventScroll: true });
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (index - 1 + groups.length) % groups.length;
        break;
      case 'ArrowRight':
        nextIndex = (index + 1) % groups.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = groups.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    activateTab(nextIndex, true);
  }

  if (groups.length === 0) return null;

  return (
    <div className="panel skills-frame">
      <div className="skills-frame-heading">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">Skills</p>
          <h2 className="font-heading text-primary">Data, AI &amp; development.</h2>
        </div>
        <span className="skills-total">{totalSkills} skills</span>
      </div>

      <div role="tablist" aria-label="Skill categories" className="skills-category-tabs">
        {groups.map((group, index) => (
          <button
            key={group.title}
            ref={(tab) => { tabRefs.current[index] = tab; }}
            type="button"
            role="tab"
            id={`${frameId}-tab-${index}`}
            aria-selected={selectedIndex === index}
            aria-controls={`${frameId}-panel-${index}`}
            tabIndex={selectedIndex === index ? 0 : -1}
            onClick={() => activateTab(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {categoryLabels[index] ?? group.title}
          </button>
        ))}
      </div>

      {groups.map((group, index) => (
        <div
          key={group.title}
          role="tabpanel"
          id={`${frameId}-panel-${index}`}
          aria-labelledby={`${frameId}-tab-${index}`}
          hidden={selectedIndex !== index}
          className="skills-category-panel"
        >
          <div className="skills-category-heading">
            <h3>{group.title}</h3>
            <span>{group.count} skills</span>
          </div>
          <div className="skills-chip-scroll" tabIndex={0} aria-label={`${group.title} skills`}>
            {children[index]}
          </div>
        </div>
      ))}
    </div>
  );
}
