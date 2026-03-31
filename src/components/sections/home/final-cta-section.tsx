'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { landingSectionReveal } from './landing-motion';

export function FinalCtaSection() {
  return (
    <motion.section id="final-cta" className="landing-final" {...landingSectionReveal}>
      <div className="landing-final-inner">
        <p className="eyebrow">Visit or join</p>
        <h2>Take the first step with PowerHouse Gym today.</h2>
        <p className="subcopy">
          If you want a gym that feels serious, supportive, and easy to commit to, start with a visit, a membership request, or a quick login if you are already with us.
        </p>
        <div className="landing-cta">
          <Button asChild variant="default" size="lg">
            <Link href="/signup/client">Request Membership</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/signup/trainer">Trainer Application</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/forgot-password">Need help logging in?</Link>
          </Button>
        </div>
        <p className="landing-trust">Two branches. Disciplined coaching. A stronger routine that actually lasts.</p>
      </div>
    </motion.section>
  );
}
