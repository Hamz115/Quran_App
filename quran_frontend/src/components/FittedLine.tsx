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
    if (!container || !content) return;

    let frame = 0;
    let disposed = false;

    const fit = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const containerWidth = container.clientWidth;
        const contentWidth = content.scrollWidth;
        if (contentWidth <= 0 || containerWidth <= 0) return;

        // Leave a one-pixel safety inset for glyph overhang/rounding. QPC fonts
        // can finish swapping after React's first layout pass, so this function
        // is also rerun by observers and document.fonts.ready below.
        const scale = Math.min(1, Math.max(0, (containerWidth - 2) / contentWidth));

        if (scale < 1) {
          content.style.transform = `scale(${scale})`;
          content.style.transformOrigin = 'right center';
          content.style.margin = '';
        } else {
          content.style.transform = '';
          content.style.transformOrigin = '';
          content.style.margin = '0 auto';
        }
      });
    };

    fit();

    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(container);
    resizeObserver.observe(content);
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit).catch(() => undefined);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

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
