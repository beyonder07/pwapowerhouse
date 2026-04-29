"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Quote, Star } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Lost 25kg in 8 months",
    content:
      "PowerHouse changed my life. The trainers understood my goals and created a plan that actually worked. I have never felt better!",
    rating: 5,
    initials: "RS",
  },
  {
    name: "Priya Patel",
    role: "Fitness Enthusiast",
    content:
      "The atmosphere is incredible. Everyone is supportive, the equipment is top-notch, and the results speak for themselves.",
    rating: 5,
    initials: "PP",
  },
  {
    name: "Amit Kumar",
    role: "Gained 10kg muscle",
    content:
      "As someone who struggled to gain weight, the personalized nutrition advice and training here made all the difference.",
    rating: 5,
    initials: "AK",
  },
]

const stats = [
  { value: "2000+", label: "Transformations" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "5+", label: "Years of Trust" },
  { value: "15+", label: "Certified Trainers" },
]

export function ResultsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section className="py-20 lg:py-32 bg-ph-navy-light/80 backdrop-blur-[2px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance">
            Join the transformation
          </h2>
          <p className="mt-8 text-lg text-slate-300 max-w-3xl mx-auto">
            Our members have achieved incredible results. From losing weight to building muscle, gaining confidence to living healthier lives.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-16 md:mb-20"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + index * 0.07 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className="text-center p-4 md:p-8 rounded-lg md:rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-accent/30 transition-colors"
            >
              <motion.p 
                className="text-2xl md:text-5xl font-bold text-accent"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.15 + index * 0.07, duration: 0.4 }}
              >
                {stat.value}
              </motion.p>
              <p className="text-xs md:text-sm text-slate-400 mt-1 md:mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonials */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1, ease: "easeOut" }}
              whileHover={{ scale: 1.01, y: -3 }}
              className="rounded-lg md:rounded-2xl border border-slate-800 bg-slate-900/50 p-5 md:p-8 space-y-3 md:space-y-4 hover:border-accent/30 transition-colors"
            >
              <div 
                className="flex items-center gap-0.5"
              >
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3 md:h-4 w-3 md:w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p 
                className="text-slate-300 text-xs md:text-sm leading-relaxed"
              >
                {`"${testimonial.content}"`}
              </p>
              <div 
                className="flex items-center gap-2 md:gap-3 pt-2"
              >
                <Avatar className="h-8 md:h-10 w-8 md:w-10 border-2 border-accent/30 bg-accent/10 flex-shrink-0">
                  <AvatarFallback className="text-accent font-semibold text-xs md:text-sm">
                    {testimonial.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-xs md:text-sm truncate">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-accent truncate">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
