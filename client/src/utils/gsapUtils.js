import { gsap } from 'gsap';

/** Staggered card entrance when tree mounts */
export const animateTreeIn = (containerEl) => {
  if (!containerEl) return;
  const cards = containerEl.querySelectorAll('.member-card');
  gsap.fromTo(
    cards,
    { opacity: 0, y: 24, scale: 0.88 },
    {
      opacity: 1, y: 0, scale: 1,
      duration: 0.45,
      stagger: { amount: 0.6, from: 'center' },
      ease: 'back.out(1.5)',
    }
  );
};

/** Card hover lift */
export const cardHoverIn = (el) => {
  if (!el) return;
  gsap.to(el, { y: -5, scale: 1.04, duration: 0.2, ease: 'power2.out' });
};

export const cardHoverOut = (el) => {
  if (!el) return;
  gsap.to(el, { y: 0, scale: 1, duration: 0.2, ease: 'power2.out' });
};

/** Fade in a panel (detail drawer, modal) */
export const panelIn = (el) => {
  if (!el) return;
  gsap.fromTo(el,
    { opacity: 0, x: 40 },
    { opacity: 1, x: 0, duration: 0.3, ease: 'power3.out' }
  );
};

/** Animate a page loading skeleton shimmer end */
export const revealPage = (el) => {
  if (!el) return;
  gsap.fromTo(el, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
};

/** Staggered entrance for member cards (list/grid view) */
export const animateMemberCards = (containerEl) => {
  if (!containerEl) return;
  const cards = containerEl.querySelectorAll('.member-card-item');
  if (cards.length === 0) return;

  gsap.killTweensOf(cards);
  cards.forEach(c => { c.style.transition = 'none'; });

  gsap.fromTo(
    cards,
    { opacity: 0, y: 20, scale: 0.95 },
    {
      opacity: 1, y: 0, scale: 1,
      duration: 0.35,
      stagger: { amount: 0.3, from: 'start' },
      ease: 'power2.out',
      onComplete: () => {
        gsap.set(cards, { clearProps: 'transform,opacity,transition' });
      },
    }
  );
};

/** Simple expand/collapse (legacy - kept for compatibility) */
export const toggleNode = (element, isOpen) => {
  if (!element) return;
  gsap.to(element, {
    duration: 0.35,
    height: isOpen ? 'auto' : 0,
    opacity: isOpen ? 1 : 0,
    ease: 'power2.out',
  });
};
