"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Image from "next/image"
import {
  Dumbbell,
  Bike,
  PersonStanding,
  Droplets,
  Shirt,
  ShieldCheck,
  Wifi,
  Car,
} from "lucide-react"

const facilities = [
  {
    icon: Dumbbell,
    title: "Weight Training",
    description: "Free weights, machines, and dedicated strength zones",
  },
  {
    icon: Bike,
    title: "Cardio Zone",
    description: "Treadmills, cycles, ellipticals, and rowing machines",
  },
  {
    icon: PersonStanding,
    title: "Functional Area",
    description: "CrossFit, TRX, kettlebells, and battle ropes",
  },
  {
    icon: Droplets,
    title: "Steam Room",
    description: "Relax and recover after intense workouts",
  },
  {
    icon: Shirt,
    title: "Locker Rooms",
    description: "Clean, secure lockers with shower facilities",
  },
  {
    icon: ShieldCheck,
    title: "24/7 Security",
    description: "CCTV surveillance and secure premises",
  },
  {
    icon: Wifi,
    title: "Free WiFi",
    description: "Stay connected while you train",
  },
  {
    icon: Car,
    title: "Parking",
    description: "Convenient parking space for members",
  },
]

const galleryImages = [
  { title: "Training Floor", src: "/training-area.png", alt: "PowerHouse Gym training floor with machines and free weights" },
  { title: "Weight Stack", src: "/weight-stack.jpg", alt: "PowerHouse Gym dumbbell rack with full weight selection" },
  { title: "Cardio Area", src: "/cardio-area.png", alt: "PowerHouse Gym cardio zone with treadmills and battle ropes" },
  { title: "Reception", src: "/reception.jpeg", alt: "PowerHouse Gym reception desk" },
]

export function FacilitiesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="facilities" className="py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance">
            Fun, trainer-led group classes
          </h2>
          <p className="mt-8 text-lg text-slate-300 max-w-3xl mx-auto">
            From strength training to high-intensity intervals, yoga to dance fitness. Pick your vibe and crush it.
          </p>
        </motion.div>

        {/* Image Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="grid gap-4 md:gap-6 grid-cols-2">
            {galleryImages.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: index * 0.12, ease: "easeOut" }}
                whileHover={{ scale: 1.02 }}
                className="relative aspect-video rounded-xl md:rounded-2xl overflow-hidden border border-slate-700 group cursor-pointer shadow-md hover:shadow-xl transition-shadow"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <p className="absolute bottom-3 left-4 text-white font-semibold text-sm md:text-base drop-shadow">
                  {image.title}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-2xl font-bold text-foreground text-center mb-12">
            Everything we offer
          </h3>
          <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {facilities.map((facility, index) => (
              <motion.div
                key={facility.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="space-y-3 p-4 md:p-5 rounded-lg md:rounded-xl bg-transparent border border-white/10 hover:border-accent/30 transition-all duration-300"
              >
                <motion.div 
                  className="flex items-center gap-3"
                  whileHover={{ x: 2 }}
                >
                  <motion.div 
                    className="flex items-center justify-center h-8 md:h-9 w-8 md:w-9 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors flex-shrink-0"
                    whileHover={{ scale: 1.12, rotate: 6 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <facility.icon className="h-4 md:h-5 w-4 md:w-5 text-accent" />
                  </motion.div>
                  <h4 className="font-semibold text-foreground text-xs md:text-sm">
                    {facility.title}
                  </h4>
                </motion.div>
                <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                  {facility.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
