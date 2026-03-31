'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GALLERY_PLACEHOLDERS, OWNER_CONTACT_PLACEHOLDERS, TRAINER_PLACEHOLDERS } from './home-data';
import { landingFadeUp, landingSectionReveal, landingStagger } from './landing-motion';

export function GallerySection() {
  return (
    <motion.section id="gallery" className="landing-section subtle" {...landingSectionReveal}>
      <div className="landing-section-head">
        <p className="eyebrow">Facilities and atmosphere</p>
        <h2>See the kind of branch environment members can expect the moment they walk in.</h2>
        <p className="subcopy">
          This section is shaped for branch visuals, support details, and trainer highlights so the page stays polished now and becomes even stronger once real media is added.
        </p>
      </div>

      <div className="landing-grid two">
        <Card className="landing-card media-column landing-card-premium">
          <CardHeader className="media-column-head landing-card-head">
            <Badge variant="outline">Branch visuals</Badge>
            <div>
              <CardTitle>Gym photo wall</CardTitle>
              <span className="subcopy">A clean space for reception shots, workout zones, and the atmosphere that makes the branch memorable.</span>
            </div>
          </CardHeader>
          <CardContent>
            <motion.div className="landing-gallery-grid" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={landingStagger}>
              {GALLERY_PLACEHOLDERS.map((item) => (
                <motion.article key={item.title} className="landing-media-placeholder" variants={landingFadeUp}>
                  <div className="placeholder-frame shimmer-block" aria-hidden="true" />
                  <strong>{item.title}</strong>
                  <span>{item.hint}</span>
                </motion.article>
              ))}
            </motion.div>
          </CardContent>
        </Card>

        <div className="landing-grid owner-contact-stack">
          <Card className="landing-card contact-card landing-card-premium">
            <CardHeader className="landing-card-head">
              <Badge variant="accent">Visit and contact</Badge>
              <div>
                <CardTitle>Visit and contact area</CardTitle>
                <p className="subcopy">This space is ready for the phone numbers, support hours, and branch desk details members look for first.</p>
              </div>
            </CardHeader>
            <CardContent>
              <motion.div className="contact-list" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={landingStagger}>
                {OWNER_CONTACT_PLACEHOLDERS.map((item) => (
                  <motion.div key={item.label} className="contact-row" variants={landingFadeUp}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </div>
                    <p className="subcopy">{item.hint}</p>
                  </motion.div>
                ))}
              </motion.div>
            </CardContent>
          </Card>

          <Card className="landing-card contact-card landing-card-premium">
            <CardHeader className="landing-card-head">
              <Badge variant="outline">Coach spotlight</Badge>
              <div>
                <CardTitle>Coach introductions</CardTitle>
                <p className="subcopy">A focused place for trainer highlights, short bios, and the kind of support members can expect on the floor.</p>
              </div>
            </CardHeader>
            <CardContent>
              <motion.div className="trainer-placeholder-list" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={landingStagger}>
                {TRAINER_PLACEHOLDERS.map((item) => (
                  <motion.article key={item.role} className="trainer-placeholder-card" variants={landingFadeUp}>
                    <div className="trainer-placeholder-avatar shimmer-block" aria-hidden="true" />
                    <div className="trainer-placeholder-copy">
                      <strong>{item.role}</strong>
                      <span>{item.hint}</span>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.section>
  );
}
