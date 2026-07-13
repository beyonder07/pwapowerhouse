"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, Zap, ShieldCheck } from "lucide-react"

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
            One membership. Personalised training and certified nutrition — everything you need, nothing you don&apos;t.
          </p>
        </motion.div>

        {/* Single Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="mx-auto max-w-lg"
        >
          <div className="relative rounded-2xl border border-accent ring-2 ring-accent/20 p-7 md:p-10 bg-transparent shadow-lg">
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent text-white text-xs font-bold rounded-full whitespace-nowrap">
                <Zap className="h-3 w-3" />
                Personal Training Plan
              </span>
            </div>

            {/* Credential badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="flex flex-wrap gap-2 mb-6 mt-2"
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
            <div className="mb-2 flex items-baseline gap-1">
              <span className="text-5xl md:text-6xl font-bold text-foreground">₹1,499</span>
              <span className="text-slate-400 text-sm">/month</span>
            </div>
            <p className="text-slate-300 text-sm mb-8 leading-relaxed">
              Train 1-on-1 with a certified trainer &amp; nutritionist. Every workout, every meal plan — built around <em>your</em> goals.
            </p>

            {/* Features */}
            <ul className="space-y-3 md:space-y-4 mb-8">
              {features.map((feature, idx) => (
                <motion.li
                  key={feature}
                  className="flex items-start gap-3 text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + idx * 0.05, duration: 0.3 }}
                >
                  <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-slate-200">{feature}</span>
                </motion.li>
              ))}
            </ul>

            <Button
              asChild
              className="w-full bg-accent hover:bg-red-600 text-white h-12 text-base font-semibold"
              size="lg"
            >
              <Link href="/signup/client">Get Started — First Session Free</Link>
            </Button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center text-slate-500 text-sm mt-10"
        >
          No joining fee. No hidden charges. Walk in and try your first session free.
        </motion.p>
      </div>
    </section>
  )
}
