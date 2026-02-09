import { useRef, useLayoutEffect } from 'react';

/**
 * FittedLine - Matches Flutter's FittedBox(fit: BoxFit.scaleDown) behavior.
 *
 * Words render at their natural font size. If the line is wider than the container,
 * it's uniformly scaled DOWN to fit. If the line is narrower, it stays at natural
 * size and is centered — it is NEVER scaled up.
 *
 * This prevents the enlargement/distortion that caused blurry text on mobile.
 * The base font size should be set large enough that most lines need scaling down.
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
        // KEY: Math.min(1.0, ...) — only scale DOWN, never up
        // This matches Flutter's FittedBox(fit: BoxFit.scaleDown)
        const scale = Math.min(1.0, containerWidth / contentWidth);

        if (scale < 1.0) {
          // Line is wider than container — shrink uniformly to fit
          content.style.transform = `scale(${scale})`;
          content.style.transformOrigin = 'right center';
          content.style.margin = '';
        } else {
          // Line fits naturally (or is short) — center it, no transform
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
