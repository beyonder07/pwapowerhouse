"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Dumbbell, UserPlus, Smartphone } from "lucide-react"
import { usePwaInstall } from "@/hooks/use-pwa-install"

export function CTASection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const { isInstallable, installPwa } = usePwaInstall()

  return (
    <section id="cta" className="py-24 lg:py-32 relative overflow-hidden bg-gradient-to-b from-background/75 to-slate-950/85 backdrop-blur-[2px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center space-y-6 md:space-y-8"
        >
          <h2 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground text-balance">
            Download the most loved fitness app
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Start your fitness journey with PowerHouse. Get access to expert trainers, group classes, and a supportive community right in your pocket.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-4 md:pt-6">
            <Button asChild className="bg-accent hover:bg-red-600 text-white h-9 md:h-11 px-4 md:px-8 text-sm md:text-base">
              <Link href="/signup/client">
                Get Started Free
                <ArrowRight className="ml-2 h-4 md:h-5 w-4 md:w-5" />
              </Link>
            </Button>
            
            <Button 
              onClick={installPwa}
              variant="outline" 
              className="border-accent text-accent hover:bg-accent hover:text-white h-9 md:h-11 px-4 md:px-8 text-sm md:text-base"
            >
              <Smartphone className="mr-2 h-4 md:h-5 w-4 md:w-5" />
              {isInstallable ? "Add to Home Screen" : "How to Install App"}
            </Button>

            <Button variant="outline" asChild className="border-slate-600 text-foreground hover:bg-slate-800 h-9 md:h-11 px-4 md:px-8 text-sm md:text-base">
              <Link href="/signup/trainer">
                <UserPlus className="mr-2 h-4 md:h-5 w-4 md:w-5" />
                Become a Trainer
              </Link>
            </Button>
          </div>

          <p className="text-slate-400 text-xs md:text-sm pt-3 md:pt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline font-semibold">
              Login here
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
