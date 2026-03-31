'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { BrandLogo } from '@/components/chrome';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { HOME_STATS } from './home-data';
import { LandingAnimatedCounter } from './animated-counter';
import { landingFadeUp, landingSoftScale, landingStagger } from './landing-motion';

const LandingHeroScene = dynamic(
  () => import('@/components/landing-hero-scene').then((module) => module.LandingHeroScene),
  {
    ssr: false,
    loading: () => <div className="hero-scene-fallback" />
  }
);

export function HeroSection() {
  return (
    <section className="landing-hero landing-hero-premium">
      <motion.div
        className="landing-hero-inner landing-hero-content"
        initial="hidden"
        animate="show"
        variants={landingStagger}
      >
        <motion.p className="eyebrow" variants={landingFadeUp}>PowerHouse Gym</motion.p>
        <motion.h1 variants={landingFadeUp}>Build strength in a gym that feels serious, guided, and worth showing up for.</motion.h1>
        <motion.p className="landing-lead" variants={landingFadeUp}>
          PowerHouse Gym is built for real-world consistency. Whether you want to lose fat, gain strength, or simply train in a focused environment, our branches are designed to keep your routine structured and your motivation high.
        </motion.p>

        <motion.div className="landing-chip-row" variants={landingFadeUp}>
          <Badge variant="accent">Coach-led training</Badge>
          <Badge variant="outline">Strength and fat loss</Badge>
          <Badge variant="outline">Two active branches</Badge>
          <Badge variant="outline">Beginner-friendly</Badge>
        </motion.div>

        <motion.div className="landing-cta" variants={landingFadeUp}>
          <Button asChild variant="default" size="lg">
            <Link href="/signup/client">Join as a Member</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/signup/trainer">Apply as Trainer</Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <a href="#branches">Explore branches</a>
          </Button>
        </motion.div>

        <motion.div className="landing-stat-strip" variants={landingFadeUp}>
          {HOME_STATS.map((stat) => (
            <div key={stat.label} className="landing-stat-pill">
              <strong>
                <LandingAnimatedCounter value={stat.value} suffix={stat.suffix || ''} />
              </strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </motion.div>

        <motion.div className="landing-floating-panel" variants={landingFadeUp}>
          <strong>Why people stay with PowerHouse</strong>
          <span>Disciplined coaching, a serious workout environment, and a system that keeps training simple enough to follow every week.</span>
        </motion.div>
      </motion.div>

      <motion.div
        className="landing-hero-visual landing-hero-visual-premium"
        initial="hidden"
        animate="show"
        variants={landingSoftScale}
      >
        <LandingHeroScene />
        <Card className="hero-card hero-card-premium">
          <CardContent className="hero-card-content">
            <div className="landing-hero-logo">
              <BrandLogo />
            </div>
            <p className="hero-card-title">What you walk into</p>
            <p className="hero-card-sub">A focused gym floor, clear coaching, and a routine that feels premium without feeling intimidating.</p>
            <div className="hero-metrics">
              <div>
                <strong>Strength floor</strong>
                <span>Free weights, structured training space, and room to train seriously.</span>
              </div>
              <div>
                <strong>Guided coaching</strong>
                <span>Trainers who focus on form, progression, and keeping you consistent.</span>
              </div>
              <div>
                <strong>Real follow-through</strong>
                <span>Branches, plans, and progress all stay organized so you do not lose momentum.</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="hero-glow" />
      </motion.div>
    </section>
  );
}

