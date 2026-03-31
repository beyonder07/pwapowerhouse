'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BrandLogo, ThemeToggle, useThemeState } from '../components/chrome';
import { HeroSection } from '../components/sections/home/hero-section';
import { BranchesSection, ExperienceSection, PlansSection, ResultsSection, TrainersSection } from '../components/sections/home/feature-sections';
import { GallerySection } from '../components/sections/home/gallery-section';
import { FinalCtaSection } from '../components/sections/home/final-cta-section';

export default function PowerHouseLandingPage() {
  const { theme, toggleTheme } = useThemeState();

  return (
    <motion.main
      className="landing-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.header className="landing-nav" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <BrandLogo />
            <div className="landing-brand-text">
              <strong>PowerHouse Gym</strong>
              <span>Strength. Discipline. Results.</span>
            </div>
          </div>

          <nav className="landing-links" aria-label="Primary">
            <a href="#experience">Why PowerHouse</a>
            <a href="#branches">Branches</a>
            <a href="#trainers">Coaches</a>
            <a href="#plans">Plans</a>
            <a href="#gallery">Facilities</a>
            <a href="#final-cta">Contact</a>
          </nav>

          <div className="landing-actions">
            <ThemeToggle theme={theme} onToggle={toggleTheme} compact />
            <a className="ghost-button" href="#branches">Visit branches</a>
            <Link className="ghost-button" href="/login">Login</Link>
            <Link className="landing-primary" href="/signup/client">Join Now</Link>
          </div>
        </div>
      </motion.header>

      <HeroSection />
      <ExperienceSection />
      <BranchesSection />
      <TrainersSection />
      <PlansSection />
      <GallerySection />
      <ResultsSection />
      <FinalCtaSection />

      <footer className="landing-footer">
        <span className="subcopy">Copyright {new Date().getFullYear()} PowerHouse Gym</span>
        <span className="subcopy">Two branches. Coach-led training. A stronger routine that lasts.</span>
      </footer>
    </motion.main>
  );
}
