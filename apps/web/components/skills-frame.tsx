'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

type SkillsFrameProps = {
  groups: { title: string; count: number }[];
  children: ReactNode[];
};

const categoryLabels: Record<string, string> = {
  'Programming & analytics': 'Analytics',
  'Machine learning': 'Machine learning',
  'AI & deep learning': 'AI & deep learning',
  'Data platforms & engineering': 'Data engineering',
  'Web development & design': 'Web & design',
  'APIs & security': 'APIs & security',
  'Cloud & deployment': 'Cloud & deployment',
};

export function SkillsFrame({ groups, children }: SkillsFrameProps) {
  const frameId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const totalSkills = groups.reduce((total, group) => total + group.count, 0);
  const tabs = [{ title: 'All skills', count: totalSkills }, ...groups];
  const activeIndex = selectedIndex < tabs.length ? selectedIndex : 0;
  const selectedTab = tabs[activeIndex];
  const showAll = activeIndex === 0;

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
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'ArrowRight':
        nextIndex = (index + 1) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
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
        {tabs.map((group, index) => (
          <button
            key={`${group.title}-${index}`}
            ref={(tab) => { tabRefs.current[index] = tab; }}
            type="button"
            role="tab"
            id={`${frameId}-tab-${index}`}
            aria-selected={activeIndex === index}
            aria-controls={`${frameId}-panel`}
            tabIndex={activeIndex === index ? 0 : -1}
            onClick={() => activateTab(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {categoryLabels[group.title] ?? group.title}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${frameId}-panel`}
        aria-labelledby={`${frameId}-tab-${activeIndex}`}
        className="skills-category-panel"
      >
        <div className="skills-category-heading">
          <h3>{selectedTab.title}</h3>
          <span>{selectedTab.count} skills</span>
        </div>
        <div className="skills-chip-scroll" tabIndex={0} aria-label={showAll ? 'All skills by category' : `${selectedTab.title} skills`}>
          {showAll ? (
            <div className="space-y-4">
              {groups.map((group, index) => (
                <section key={`${group.title}-${index}`} aria-labelledby={`${frameId}-group-${index}`}>
                  <div className="skills-category-heading">
                    <h4 id={`${frameId}-group-${index}`} className="min-w-0 break-words text-[13px]">{group.title}</h4>
                    <span>{group.count}</span>
                  </div>
                  {children[index]}
                </section>
              ))}
            </div>
          ) : children[activeIndex - 1]}
        </div>
      </div>
    </div>
  );
}
