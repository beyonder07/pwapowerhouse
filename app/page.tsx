"use client"

import {
  LandingNav,
  HeroSection,
  BranchesSection,
  PlansSection,
  FacilitiesSection,
  ResultsSection,
  CTASection,
  Footer,
  WhySection,
} from "@/components/landing"

export default function LandingPage() {
  return (
    <div className="app-screen relative bg-background">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          className="h-full w-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source src="/videos/powerhouse-hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/55 to-background/85" />
      </div>

      <LandingNav />
      <div className="app-scroll safe-bottom relative z-10">
        <main>
          <HeroSection />
          <BranchesSection />
          <WhySection />
          <PlansSection />
          <FacilitiesSection />
          <ResultsSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </div>
  )
}
