'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export function CardCarousel({ label, children }: { label: string; children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const trackId = useId();
  const [bounds, setBounds] = useState({ previous: false, next: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const updateBounds = () => {
      const previous = track.scrollLeft > 2;
      const next = track.scrollLeft < track.scrollWidth - track.clientWidth - 2;
      setBounds((current) => (
        current.previous === previous && current.next === next ? current : { previous, next }
      ));
    };
    updateBounds();
    track.addEventListener('scroll', updateBounds, { passive: true });
    const observer = new ResizeObserver(updateBounds);
    observer.observe(track);
    Array.from(track.children).forEach((card) => observer.observe(card));

    return () => {
      track.removeEventListener('scroll', updateBounds);
      observer.disconnect();
    };
  }, [children]);

  function scrollToCard(direction: -1 | 1, edge?: 'start' | 'end') {
    const track = trackRef.current;
    if (!track) return;

    const card = track.firstElementChild;
    const step = (card?.getBoundingClientRect().width ?? track.clientWidth) + 16;
    const left = edge === 'start' ? 0 : edge === 'end' ? track.scrollWidth : track.scrollLeft + direction * step;
    track.scrollTo({
      left,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        scrollToCard(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        scrollToCard(1);
        break;
      case 'Home':
        event.preventDefault();
        scrollToCard(-1, 'start');
        break;
      case 'End':
        event.preventDefault();
        scrollToCard(1, 'end');
        break;
    }
  }

  return (
    <div className="card-carousel" role="region" aria-label={label} aria-roledescription="carousel">
      <div className="card-carousel-controls">
        <button
          type="button"
          aria-label={`Previous ${label.toLowerCase()} card`}
          aria-controls={trackId}
          disabled={!bounds.previous}
          onClick={() => scrollToCard(-1)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m14 6-6 6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={`Next ${label.toLowerCase()} card`}
          aria-controls={trackId}
          disabled={!bounds.next}
          onClick={() => scrollToCard(1)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="m10 6 6 6-6 6" />
          </svg>
        </button>
      </div>
      <div
        ref={trackRef}
        id={trackId}
        className="card-carousel-track"
        tabIndex={0}
        role="group"
        aria-label={`Scroll ${label.toLowerCase()} cards with arrow keys`}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
