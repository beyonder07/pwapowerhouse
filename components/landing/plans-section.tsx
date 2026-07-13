"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, Zap, ShieldCheck, Crosshair, Sparkles, PhoneCall } from "lucide-react"

const features = [
  "Full gym access — 6 days a week",
  "1-on-1 personal trainer sessions",
  "Custom workout plan (updated monthly)",
  "Certified nutrition & diet guidance",
  "Personalised meal chart",
  "Weekly progress check-ins",
  "Both branches access",
  "Locker room facility",
]

const badges = ["Certified Trainer", "Certified Nutritionist"]

const goalExamples = [
  { icon: "💪", label: "Weight Loss" },
  { icon: "🏋️", label: "Muscle Gain" },
  { icon: "🥗", label: "Body Transformation" },
  { icon: "🎯", label: "Sport-Specific" },
]

export function PlansSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="plans" className="py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance">
            Train with an expert, not just a plan
          </h2>
          <p className="mt-8 text-lg text-slate-300 max-w-2xl mx-auto">
            Personalised training and certified nutrition — everything you need, nothing you don&apos;t.
          </p>
        </motion.div>

        {/* Two Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">

          {/* Card 1 — Standard Plan */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <div className="relative rounded-2xl border border-accent ring-2 ring-accent/20 p-7 md:p-8 bg-transparent shadow-lg h-full flex flex-col">
              {/* Top badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white text-xs font-bold rounded-full whitespace-nowrap">
                  <Zap className="h-3 w-3" />
                  Most Popular
                </span>
              </div>

              {/* Credential badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="flex flex-wrap gap-2 mb-5 mt-2"
              >
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {badge}
                  </span>
                ))}
              </motion.div>

              {/* Price */}
              <div className="mb-1 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-foreground">₹1,499</span>
                <span className="text-slate-400 text-sm">/month</span>
              </div>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Train 1-on-1 with a certified trainer &amp; nutritionist. Every workout, every meal plan built around <em>your</em> goals.
              </p>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {features.map((feature, idx) => (
                  <motion.li
                    key={feature}
                    className="flex items-start gap-3 text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.2 + idx * 0.04, duration: 0.3 }}
                  >
                    <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-slate-200">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              <Button
                asChild
                className="w-full bg-accent hover:bg-red-600 text-white h-12 text-sm font-semibold"
                size="lg"
              >
                <Link href="/signup/client">Get Started — First Session Free</Link>
              </Button>
            </div>
          </motion.div>

          {/* Card 2 — Goal-Based Custom Plan */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            <div className="relative rounded-2xl border border-white/15 p-7 md:p-8 bg-transparent h-full flex flex-col overflow-hidden group hover:border-white/30 transition-colors duration-300">

              {/* Subtle glow background */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent pointer-events-none rounded-2xl" />

              {/* Top badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/10 backdrop-blur-sm text-white text-xs font-bold rounded-full whitespace-nowrap border border-white/20">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Goal-Based Pricing
                </span>
              </div>

              <div className="mt-2 mb-5">
                <Crosshair className="h-8 w-8 text-accent mb-3" />
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-1">Advanced Personal Training</h3>
                <p className="text-slate-400 text-xs">Charges customised to your goal &amp; timeline</p>
              </div>

              {/* Price display */}
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">Custom</span>
              </div>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Every body is different. We assess your goal, current fitness level, and timeline — then quote a plan built <em>only</em> for you.
              </p>

              {/* Goal chips */}
              <div className="flex flex-wrap gap-2 mb-6">
                {goalExamples.map((g) => (
                  <motion.span
                    key={g.label}
                    whileHover={{ scale: 1.05 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10 hover:border-accent/40 hover:text-white transition-colors cursor-default"
                  >
                    <span>{g.icon}</span>
                    {g.label}
                  </motion.span>
                ))}
              </div>

              {/* What's included */}
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "In-depth fitness & goal assessment",
                  "Fully bespoke training programme",
                  "Certified nutrition plan for your goal",
                  "Flexible session frequency",
                  "Dedicated trainer accountability",
                  "Reassessment every 4 weeks",
                ].map((item, idx) => (
                  <motion.li
                    key={item}
                    className="flex items-start gap-3 text-sm"
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.3 + idx * 0.04, duration: 0.3 }}
                  >
                    <Check className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-200">{item}</span>
                  </motion.li>
                ))}
              </ul>

              <Button
                asChild
                variant="outline"
                className="w-full border-white/20 text-foreground hover:bg-white/10 hover:border-white/40 h-12 text-sm font-semibold group/btn transition-all"
                size="lg"
              >
                <a href="tel:+919411009196">
                  <PhoneCall className="h-4 w-4 mr-2 text-accent group-hover/btn:scale-110 transition-transform" />
                  Talk to Us — Get a Quote
                </a>
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center text-slate-500 text-sm mt-10"
        >
          No joining fee. No hidden charges. Walk in and try your first session free.
        </motion.p>
      </div>
    </section>
  )
}
