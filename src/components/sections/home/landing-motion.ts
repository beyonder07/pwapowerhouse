export const landingFadeUp = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.56, ease: [0.22, 1, 0.36, 1] as const }
  }
};

export const landingSoftScale = {
  hidden: { opacity: 0, scale: 0.965, y: 18, filter: 'blur(12px)' },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] as const }
  }
};

export const landingStagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.06
    }
  }
};

export const landingSectionReveal = {
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount: 0.18 },
  variants: landingFadeUp
} as const;
