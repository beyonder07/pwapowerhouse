"use client"

import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"
import { Dumbbell, Users, Clock, Award, Heart, Target } from "lucide-react"

const features = [
  {
    icon: Dumbbell,
    title: "Fun, trainer-led group classes",
    description:
      "High-energy workouts designed to keep you motivated and coming back for more.",
  },
  {
    icon: Users,
    title: "Supportive community",
    description:
      "Join thousands of like-minded fitness enthusiasts pushing each other to be better.",
  },
  {
    icon: Award,
    title: "Expert guidance",
    description:
      "Certified trainers who create personalized programs tailored to your goals.",
  },
  {
    icon: Clock,
    title: "Flexible access",
    description:
      "Train anytime, anywhere with our gym locations and at-home workout options.",
  },
  {
    icon: Heart,
    title: "Holistic wellness",
    description:
      "Beyond fitness—nutrition, recovery, and mental health support included.",
  },
  {
    icon: Target,
    title: "Proven results",
    description:
      "Join our success stories. Real transformations from real members like you.",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export function WhySection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="why" className="py-16 md:py-20 lg:py-32 bg-background/75 backdrop-blur-[2px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-20"
        >
          <h2 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground text-balance">
            The PowerHouse way
          </h2>
          <p className="mt-4 md:mt-6 text-sm md:text-base lg:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Making fitness fun, results real, and your transformation possible. We&apos;ve built a community where you&apos;re never alone in your journey.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              className="group space-y-3 p-4 md:p-6 rounded-lg md:rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-accent/30 transition-all duration-300 overflow-hidden"
            >
              <div 
                className="flex items-center gap-3"
              >
                <motion.div 
                  className="flex items-center justify-center h-9 md:h-10 w-9 md:w-10 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors flex-shrink-0"
                  whileHover={{ scale: 1.1, rotate: 6 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <feature.icon className="h-4 md:h-5 w-4 md:w-5 text-accent" />
                </motion.div>
              </div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
