import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

/**
 * PageTransition
 *
 * Wraps a page/section and plays a smooth fade + slide-in animation
 * whenever it mounts (i.e. on every route change).
 */
export default function PageTransition({ children, className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const tween = gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: 'power2.out',
    });

    return () => {
      tween.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ opacity: 0, transform: 'translateY(16px)' }}
    >
      {children}
    </div>
  );
}
