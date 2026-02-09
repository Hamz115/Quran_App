import { useRef, useLayoutEffect } from 'react';

/**
 * FittedLine - Renders children at natural size, then scales to exactly fit container width.
 * Each line of QPC words is uniformly scaled so it fills the full page width edge-to-edge,
 * matching the printed Mushaf where every line stretches from right margin to left margin.
 *
 * Short lines (< 40% full, e.g. last line of a surah with 2-3 words) are NOT stretched —
 * they stay at natural size and are CENTERED on the line, matching real Mushaf behavior.
 */
export default function FittedLine({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (container && content) {
      const containerWidth = container.clientWidth;
      const contentWidth = content.scrollWidth;
      if (contentWidth > 0 && containerWidth > 0) {
        const fillRatio = contentWidth / containerWidth;

        if (fillRatio >= 0.4) {
          // Line is reasonably full — stretch to fill the full width
          const scale = containerWidth / contentWidth;
          content.style.transform = `scaleX(${scale})`;
          content.style.transformOrigin = 'right center';
          content.style.margin = '';
        } else {
          // Very short line (< 40% full) — keep natural size, center it
          content.style.transform = '';
          content.style.transformOrigin = '';
          content.style.margin = '0 auto';
        }
      }
    }
  });

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', overflow: 'hidden' }}>
      <div
        ref={contentRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          width: 'max-content',
        }}
      >
        {children}
      </div>
    </div>
  );
}
