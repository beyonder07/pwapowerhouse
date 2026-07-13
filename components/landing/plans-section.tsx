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

const customFeatures = [
  "In-depth fitness & goal assessment",
  "Fully bespoke training programme",
  "Certified nutrition plan for your goal",
  "Flexible session frequency",
  "Dedicated trainer accountability",
  "Reassessment every 4 weeks",
]

export function PlansSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="plans" className="py-24 lg:py-36">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance">
            Train with an expert,<br className="hidden sm:block" /> not just a plan
          </h2>
          <p className="mt-6 text-base md:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Personalised training and certified nutrition — everything you need, nothing you don&apos;t.
          </p>
        </motion.div>

        {/* Two Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">

          {/* ── Card 1 — Standard Plan ── */}
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            whileHover={{ y: -6, scale: 1.01 }}
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
            className="relative rounded-2xl border border-accent ring-2 ring-accent/25 p-8 md:p-10 bg-transparent flex flex-col transition-shadow duration-300 hover:shadow-[0_35px_90px_rgba(220,38,38,0.15)]"
          >
            {/* Most Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white text-xs font-bold tracking-wide rounded-full whitespace-nowrap shadow-[0_4px_14px_rgba(220,38,38,0.5)]">
                <Zap className="h-3 w-3" />
                Most Popular
              </span>
            </div>

            {/* Credential badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex flex-wrap gap-2 mb-7 mt-3"
            >
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 text-accent border border-accent/25 tracking-wide"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {badge}
                </span>
              ))}
            </motion.div>

            {/* Price */}
            <div className="mb-1 flex items-baseline gap-1.5">
              <span className="text-6xl font-extrabold tracking-tight text-foreground">₹1,499</span>
              <span className="text-slate-400 text-sm font-medium">/month</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Train 1-on-1 with a certified trainer &amp; nutritionist. Every workout, every meal plan built around <em className="not-italic text-slate-200 font-medium">your</em> goals.
            </p>

            {/* Divider */}
            <div className="border-t border-white/8 mb-7" />

            {/* Features */}
            <ul className="space-y-4 mb-9 flex-1">
              {features.map((feature, idx) => (
                <motion.li
                  key={feature}
                  className="flex items-start gap-3 text-sm"
                  initial={{ opacity: 0, x: -12 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.25 + idx * 0.045, duration: 0.3 }}
                >
                  <span className="mt-0.5 flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-accent/15 border border-accent/30">
                    <Check className="h-3 w-3 text-accent" />
                  </span>
                  <span className="text-slate-200 leading-snug">{feature}</span>
                </motion.li>
              ))}
            </ul>

            <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400 }}>
              <Button
                asChild
                className="w-full bg-accent hover:bg-red-600 text-white h-13 text-sm font-bold tracking-wide shadow-[0_4px_20px_rgba(220,38,38,0.35)] hover:shadow-[0_6px_28px_rgba(220,38,38,0.5)] transition-all duration-200"
                size="lg"
              >
                <Link href="/signup/client">Get Started — First Session Free</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* ── Card 2 — Goal-Based Custom Plan ── */}
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
            whileHover={{ y: -6, scale: 1.01 }}
            style={{
              background: "rgba(12,12,12,0.72)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            }}
            className="relative rounded-2xl border border-white/10 flex flex-col overflow-hidden transition-all duration-300 hover:border-white/20 hover:shadow-[0_35px_90px_rgba(220,38,38,0.1)] p-8 md:p-10"
          >
            {/* Radial glow decoration */}
            <div
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)" }}
            />
            <div
              className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(220,38,38,0.05) 0%, transparent 70%)" }}
            />

            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#1a1a1a] text-white text-xs font-bold tracking-wide rounded-full whitespace-nowrap border border-white/15 shadow-lg">
                <Sparkles className="h-3 w-3 text-amber-400" />
                Elite Coaching
              </span>
            </div>

            {/* Icon container */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="mt-3 mb-6 self-start"
            >
              <div
                className="flex items-center justify-center w-14 h-14 rounded-xl border border-accent/30"
                style={{
                  background: "rgba(220,38,38,0.12)",
                  boxShadow: "0 0 24px rgba(220,38,38,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                <Crosshair className="h-7 w-7 text-accent" />
              </div>
            </motion.div>

            {/* Title block */}
            <div className="mb-5">
              <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                Advanced Personal<br />Training
              </h3>
              <p className="text-slate-500 text-xs font-medium mt-1.5 tracking-wide uppercase">
                Charges customised to your goal &amp; timeline
              </p>
            </div>

            {/* Custom pricing */}
            <div className="mb-2">
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-1">Pricing</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">Custom</span>
              </div>
              <p className="text-slate-400 text-xs mt-1">Starts after a free goal assessment session</p>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Every body is different. We assess your goal, fitness level, and timeline — then design a programme built <em className="not-italic font-semibold text-white">only</em> for you.
            </p>

            {/* Goal chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {goalExamples.map((g, i) => (
                <motion.span
                  key={g.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.35 + i * 0.05, duration: 0.25 }}
                  whileHover={{ scale: 1.06, y: -1 }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-slate-300 border border-white/10 hover:bg-accent/10 hover:border-accent/40 hover:text-white transition-all duration-200 cursor-default"
                >
                  <span className="text-sm">{g.icon}</span>
                  {g.label}
                </motion.span>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-white/8 mb-6" />

            {/* Feature list */}
            <ul className="space-y-4 mb-9 flex-1">
              {customFeatures.map((item, idx) => (
                <motion.li
                  key={item}
                  className="flex items-start gap-3 text-sm"
                  initial={{ opacity: 0, x: -12 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.35 + idx * 0.045, duration: 0.3 }}
                >
                  <span className="mt-0.5 flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-amber-400/10 border border-amber-400/25">
                    <Check className="h-3 w-3 text-amber-400" />
                  </span>
                  <span className="text-slate-200 leading-snug">{item}</span>
                </motion.li>
              ))}
            </ul>

            <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 400 }}>
              <Button
                asChild
                className="w-full bg-accent hover:bg-red-600 text-white h-13 text-sm font-bold tracking-wide shadow-[0_4px_20px_rgba(220,38,38,0.25)] hover:shadow-[0_6px_28px_rgba(220,38,38,0.4)] transition-all duration-200"
                size="lg"
              >
                <a href="tel:+919411009196" className="flex items-center justify-center gap-2">
                  <PhoneCall className="h-4 w-4" />
                  Book Free Assessment
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center text-slate-600 text-sm mt-12"
        >
          No joining fee &middot; No hidden charges &middot; First session always free
        </motion.p>
      </div>
    </section>
  )
}
