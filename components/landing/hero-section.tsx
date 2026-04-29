"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Hero Container */}
      <div className="relative min-h-screen md:h-[100vh] flex items-center justify-center pt-20 md:pt-0">
        {/* Content Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-background/25" />

        {/* Text Content */}
        <div className="relative z-10 container mx-auto px-4 py-16 md:py-20 text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6 md:space-y-8"
          >
            <h1 className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight text-balance">
              Strength isn’t given. It’s forged.
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-base md:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed"
            >
              Unlimited access to expert trainers, group classes, and premium facilities
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-3 md:pt-4"
            >
              <Button asChild className="glow-red tap-target h-9 md:h-11 px-4 md:px-8 text-sm md:text-base">
                <Link href="/signup/client">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 md:h-5 w-4 md:w-5" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="tap-target border-slate-600 text-foreground hover:bg-slate-800 h-9 md:h-11 px-4 md:px-8 text-sm md:text-base">
                <Link href="#plans">
                  View Plans
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator - Hidden on mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="flex flex-col items-center gap-2"
          >
            <div className="h-8 w-5 rounded-full border-2 border-slate-400/40 flex justify-center p-1.5">
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="h-1.5 w-0.5 bg-slate-400/60 rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
