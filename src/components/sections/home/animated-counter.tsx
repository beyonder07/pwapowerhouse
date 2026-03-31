'use client';

import { animate, useInView, useMotionValue, useMotionValueEvent } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export function LandingAnimatedCounter({
  value,
  prefix = '',
  suffix = ''
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState('0');

  useMotionValueEvent(motionValue, 'change', (latest) => {
    setDisplay(Math.round(latest).toLocaleString('en-IN'));
  });

  useEffect(() => {
    if (!inView) {
      return;
    }

    const controls = animate(motionValue, value, {
      duration: 1,
      ease: 'easeOut'
    });

    return () => controls.stop();
  }, [inView, motionValue, value]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
