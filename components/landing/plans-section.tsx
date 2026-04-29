"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, Zap } from "lucide-react"

const plans = [
  {
    name: "PowerHouse Pro",
    price: "999",
    period: "month",
    description: "Unlimited access to all gyms and live workouts",
    features: [
      "All PRO gyms access",
      "At-home live workouts",
      "Group classes",
      "Progress tracking",
      "Mobile app access",
    ],
    popular: false,
    cta: "Try for Free",
  },
  {
    name: "PowerHouse Elite",
    price: "1,499",
    period: "month",
    description: "Premium experience with personal coaching",
    features: [
      "All Elite gyms access",
      "All PRO gyms included",
      "Unlimited group classes",
      "Personal trainer sessions",
      "Nutrition planning",
      "Priority support",
    ],
    popular: true,
    cta: "Try for Free",
  },
  {
    name: "Sports & Fitness",
    price: "1,299",
    period: "month",
    description: "Gyms, sports, and coaching all in one",
    features: [
      "Badminton & swimming",
      "Guaranteed playing partner",
      "Gym access",
      "Expert guidance",
      "Flexible scheduling",
      "Community events",
    ],
    popular: false,
    cta: "Try for Free",
  },
]

export function PlansSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="plans" className="py-20 lg:py-32 bg-ph-navy-light/80 backdrop-blur-[2px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance">
            One membership for all your fitness needs
          </h2>
          <p className="mt-8 text-lg text-slate-300 max-w-3xl mx-auto">
            Choose unlimited access to group classes, gyms, and at-home workouts.
          </p>
        </motion.div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.12, ease: "easeOut" }}
              whileHover={plan.popular ? { y: -8, scale: 1.01 } : { y: -4, scale: 1.01 }}
              className={`relative rounded-xl md:rounded-2xl border p-5 md:p-8 transition-all duration-300 ${
                plan.popular
                  ? "border-accent bg-slate-900/80 ring-2 ring-accent/20 scale-100 md:scale-105 lg:scale-110 shadow-lg"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 md:px-4 py-1 md:py-1.5 bg-accent text-white text-xs font-bold rounded-full">
                    <Zap className="h-3 w-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6 md:mb-8">
                <h3 className="text-lg md:text-2xl font-bold text-foreground">{plan.name}</h3>
                <div className="mt-3 md:mt-4 flex items-baseline gap-1">
                  <span className="text-3xl md:text-5xl font-bold text-foreground">
                    ₹{plan.price}
                  </span>
                  <span className="text-slate-400 text-sm">/{plan.period}</span>
                </div>
                <p className="mt-3 md:mt-4 text-slate-300 text-xs md:text-sm leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                {plan.features.map((feature, idx) => (
                  <motion.li 
                    key={feature} 
                    className="flex items-start gap-3 text-xs md:text-sm"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ delay: index * 0.12 + idx * 0.05, duration: 0.3 }}
                  >
                    <Check className="h-4 md:h-5 w-4 md:w-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              <Button
                asChild
                className={`w-full ${plan.popular ? "bg-accent hover:bg-red-600" : "border-slate-700 text-foreground hover:bg-slate-800"}`}
                variant={plan.popular ? "default" : "outline"}
                size="lg"
              >
                <Link href="/signup/client">{plan.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-16"
        >
          <p className="text-slate-400 text-sm mb-6">
            Not sure which plan? All memberships include a free trial session.
          </p>
          <Button asChild variant="outline" className="border-slate-600">
            <Link href="#contact">
              Talk to a fitness coach
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
