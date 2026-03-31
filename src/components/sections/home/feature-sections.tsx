'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { DEFAULT_GYM_BRANCHES } from '@/lib/location';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HOME_PLANS, HOME_TRAINERS } from './home-data';
import { landingFadeUp, landingSectionReveal, landingStagger } from './landing-motion';

export function ExperienceSection() {
  return (
    <motion.section id="experience" className="landing-section subtle" {...landingSectionReveal}>
      <div className="landing-section-head">
        <p className="eyebrow">Why PowerHouse</p>
        <h2>A gym experience that feels focused, motivating, and easy to follow.</h2>
        <p className="subcopy">
          PowerHouse is built around the workout itself first. The atmosphere, coaching, and structure are all designed to help members stay consistent, not overwhelmed.
        </p>
      </div>
      <motion.div className="landing-grid four" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={landingStagger}>
        {[
          ['Serious training environment', 'A focused gym floor, strong atmosphere, and the kind of space that makes it easier to stay disciplined.'],
          ['Coach-led guidance', 'From first-timers to experienced members, coaching stays practical, encouraging, and result-oriented.'],
          ['Programs for real goals', 'Whether your goal is fat loss, strength, or general fitness, plans stay clear and easy to commit to.'],
          ['Beginner-friendly journey', 'You do not need to know gym jargon to get started. The flow from joining to training stays simple.']
        ].map(([title, copy]) => (
          <motion.div key={title} variants={landingFadeUp}>
            <Card className="landing-card landing-card-premium">
              <CardHeader className="landing-card-head">
                <Badge variant="outline">PowerHouse</Badge>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="subcopy">{copy}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

export function BranchesSection() {
  return (
    <motion.section id="branches" className="landing-section" {...landingSectionReveal}>
      <div className="landing-section-head">
        <p className="eyebrow">Branches</p>
        <h2>Train at the branch that fits your day, without losing your routine.</h2>
        <p className="subcopy">
          Both PowerHouse branches follow the same disciplined standard. Choose the one nearest to you, visit easily, and train in a familiar, guided environment.
        </p>
      </div>
      <motion.div className="landing-grid two" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={landingStagger}>
        {DEFAULT_GYM_BRANCHES.map((branch) => (
          <motion.div key={branch.id} variants={landingFadeUp} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="landing-card branch-highlight-card landing-card-premium">
              <CardHeader className="branch-highlight-head landing-card-head">
                <div>
                  <CardTitle>{branch.label}</CardTitle>
                  <CardDescription className="subcopy">Attendance radius: {branch.radiusMeters} meters</CardDescription>
                </div>
                <Badge variant="accent">Maps ready</Badge>
              </CardHeader>
              <CardContent className="landing-card-stack">
                <p className="subcopy">
                  See the route instantly, walk in with confidence, and train in a branch that keeps the same PowerHouse coaching feel.
                </p>
                <div className="landing-cta branch-cta">
                  <Button asChild variant="secondary">
                    <a href={branch.mapsUrl} target="_blank" rel="noreferrer">
                      Open in Google Maps
                    </a>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/signup/client">Join this branch</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

export function TrainersSection() {
  return (
    <motion.section id="trainers" className="landing-section subtle" {...landingSectionReveal}>
      <div className="landing-section-head">
        <p className="eyebrow">Coaches</p>
        <h2>Coaches who make your workouts feel guided, not random.</h2>
        <p className="subcopy">Every trainer spotlight here is meant to show the kind of support members can expect on the floor: practical, motivating, and focused on progress.</p>
      </div>
      <motion.div className="landing-grid three" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={landingStagger}>
        {HOME_TRAINERS.map((trainer) => (
          <motion.div key={trainer.name} variants={landingFadeUp} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="landing-card trainer-card landing-card-premium">
              <CardContent className="landing-card-stack">
                <div className="trainer-avatar" aria-hidden="true">
                  {trainer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                </div>
                <div className="trainer-meta">
                  <strong>{trainer.name}</strong>
                  <span className="subcopy">
                    {trainer.role} - {trainer.years}
                  </span>
                </div>
                <div className="trainer-tags">
                  {trainer.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="subcopy">Technique first. Progress second. Motivation follows when training actually makes sense.</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

export function PlansSection() {
  return (
    <motion.section id="plans" className="landing-section" {...landingSectionReveal}>
      <div className="landing-section-head">
        <p className="eyebrow">Plans</p>
        <h2>Membership plans that stay clear from day one.</h2>
        <p className="subcopy">Choose the plan that fits your goal and training intensity, then let the coaches guide the rest.</p>
      </div>
      <motion.div className="landing-grid three" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={landingStagger}>
        {HOME_PLANS.map((plan) => (
          <motion.div key={plan.name} variants={landingFadeUp} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card className={`landing-card plan-card landing-card-premium ${plan.highlight ? 'highlight' : ''}`}>
              <CardHeader className="plan-head landing-card-head">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="subcopy">{plan.blurb}</CardDescription>
                </div>
                <div className="plan-price">
                  <strong>{plan.price}</strong>
                </div>
              </CardHeader>
              <CardContent className="landing-card-stack">
                <ul className="check-list">
                  {plan.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Button asChild variant={plan.highlight ? 'default' : 'secondary'}>
                  <Link href="/signup/client">Choose {plan.name}</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

export function ResultsSection() {
  return (
    <motion.section id="results" className="landing-section subtle" {...landingSectionReveal}>
      <div className="landing-section-head">
        <p className="eyebrow">Results</p>
        <h2>The difference members feel after a few consistent weeks.</h2>
        <p className="subcopy">A good gym is not only about machines. It is about energy, accountability, coaching, and staying regular long enough to actually see change.</p>
      </div>
      <motion.div className="landing-grid three" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={landingStagger}>
        {[
          ['More confidence on the floor', 'Members stay more consistent when the workout space feels motivating and the coaches stay available.'],
          ['Better follow-through', 'Simple plans, visible routine, and branch flexibility make it easier to stick with training week after week.'],
          ['A stronger gym culture', 'When training feels organized and coach-led, members feel more accountable and progress feels more real.']
        ].map(([title, copy]) => (
          <motion.div key={title} variants={landingFadeUp}>
            <Card className="landing-card landing-card-premium">
              <CardHeader className="landing-card-head">
                <Badge variant="accent">Member result</Badge>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="subcopy">{copy}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
