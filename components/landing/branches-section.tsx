"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Image, { type StaticImageData } from "next/image"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Phone, Navigation, Star } from "lucide-react"
import indiraChowkImage from "../../images and videos/475749486_1185860763547014_8229914112007741340_n.jpg"
import pathikChowkImage from "../../images and videos/ed8b16dc-a51a-4c44-bbba-380e4ab2f2f3.png"

interface Branch {
  id: string
  name: string
  subtitle?: string
  address: string
  phone: string
  hours: string
  rating: number
  reviews: number
  mapUrl: string
  features: string[]
  image: string | StaticImageData
  isNew?: boolean
}

const branches: Branch[] = [
  {
    id: "indira-chowk",
    name: "Indira Chowk Branch",
    address: "Indira Chowk, Main Road",
    phone: "+91 9411009196",
    hours: "5:00 AM - 11:00 PM",
    rating: 4.8,
    reviews: 120,
    mapUrl:
      "https://www.google.com/maps/dir//Power+House+Gym,+Civil+Lines,+near+MY+MART,+Budaun,+Uttar+Pradesh+243601/@28.0317488,79.1242667,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x397545eae4106853:0xd8f6742e12db8be2!2m2!1d79.1316603!2d28.0320613?entry=ttu&g_ep=EgoyMDI2MDQyNy4wIKXMDSoASAFQAw%3D%3D",
    features: ["Cardio Zone", "Weight Training", "Personal Training", "Locker Rooms"],
    image: indiraChowkImage,
  },
  {
    id: "pathik-chowk",
    name: "Pathik Chowk Branch",
    subtitle: "Rajendra Complex",
    address: "Rajendra Complex, Pathik Chowk",
    phone: "+91 8077411696",
    hours: "5:00 AM - 11:00 PM",
    rating: 4.9,
    reviews: 85,
    mapUrl:
      "https://www.google.com/maps/place/Power+House+Gym/@28.0429756,79.1096431,15z/data=!4m10!1m2!2m1!1spowerhouse+budaun!3m6!1s0x397545862e915073:0x7af65aec0e6bc596!8m2!3d28.0429756!4d79.1271526!15sChFwb3dlcmhvdXNlIGJ1ZGF1bloTIhFwb3dlcmhvdXNlIGJ1ZGF1bpIBA2d5beABAA!16s%2Fg%2F11j337_6qn?entry=ttu&g_ep=EgoyMDI2MDQyNy4wIKXMDSoASAFQAw%3D%3D",
    features: ["Cardio Zone", "Weight Training", "CrossFit Area", "Steam Room"],
    image: pathikChowkImage,
    isNew: true,
  },
]

export function BranchesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="branches" className="py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground text-balance">
            Find a branch near you
          </h2>
          <p className="mt-8 text-lg text-slate-300 max-w-3xl mx-auto">
            Two locations with world-class facilities. Visit and experience the PowerHouse difference.
          </p>
        </motion.div>

        <div className="grid gap-6 md:gap-8 grid-cols-1 lg:grid-cols-2">
          {branches.map((branch, index) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15, ease: "easeOut" }}
              whileHover={{ scale: 1.01, y: -4 }}
              className="group relative rounded-lg md:rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-accent/30 transition-all shadow-md hover:shadow-lg"
            >
              {/* Image placeholder */}
              <motion.div 
                className="relative h-40 md:h-56 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden"
                whileHover={{ scale: 1.05 }}
              >
                <Image
                  src={branch.image}
                  alt={`${branch.name} photo`}
                  fill
                  className="object-cover opacity-85"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {branch.isNew && (
                  <span className="absolute top-4 right-4 px-3 py-1 bg-accent text-white text-xs font-bold rounded-full">
                    NEW
                  </span>
                )}
              </motion.div>

              <div className="p-4 md:p-6">
                <motion.div 
                  className="flex items-start justify-between gap-3 mb-3 md:mb-4"
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ delay: index * 0.15 + 0.1, duration: 0.3 }}
                >
                  <div>
                    <h3 className="text-base md:text-xl font-bold text-foreground">
                      {branch.name}
                    </h3>
                    {branch.subtitle && (
                      <p className="text-xs md:text-sm text-slate-400">{branch.subtitle}</p>
                    )}
                  </div>
                  <motion.div 
                    className="flex items-center gap-1 text-xs md:text-sm bg-slate-800/50 px-2 md:px-3 py-1 rounded-lg flex-shrink-0"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Star className="h-3 md:h-4 w-3 md:w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-foreground">{branch.rating}</span>
                  </motion.div>
                </motion.div>

                <motion.div 
                  className="space-y-2 md:space-y-3 mb-4 md:mb-6"
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ delay: index * 0.15 + 0.12, duration: 0.3 }}
                >
                  <div 
                    className="flex items-start gap-2 md:gap-3 text-xs md:text-sm"
                  >
                    <MapPin className="h-3.5 md:h-4 w-3.5 md:w-4 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{branch.address}</span>
                  </div>
                  <div 
                    className="flex items-center gap-2 md:gap-3 text-xs md:text-sm"
                  >
                    <Phone className="h-3.5 md:h-4 w-3.5 md:w-4 text-accent flex-shrink-0" />
                    <a href={`tel:${branch.phone.replace(/\s/g, "")}`} className="text-slate-300 hover:text-accent transition-colors">
                      {branch.phone}
                    </a>
                  </div>
                  <div 
                    className="flex items-center gap-2 md:gap-3 text-xs md:text-sm"
                  >
                    <Clock className="h-3.5 md:h-4 w-3.5 md:w-4 text-accent flex-shrink-0" />
                    <span className="text-slate-300">{branch.hours}</span>
                  </div>
                </motion.div>

                <motion.div 
                  className="flex flex-wrap gap-2 mb-4 md:mb-6"
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : {}}
                  transition={{ delay: index * 0.15 + 0.15, duration: 0.3 }}
                >
                  {branch.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-2 md:px-2.5 py-0.5 md:py-1 text-xs bg-slate-800 text-slate-300 rounded-lg"
                    >
                      {feature}
                    </span>
                  ))}
                </motion.div>

                <div className="flex gap-2 md:gap-3">
                  <Button asChild size="sm" className="flex-1 bg-accent hover:bg-red-600 text-xs md:text-sm h-9 md:h-10">
                    <a href={branch.mapUrl} target="_blank" rel="noopener noreferrer">
                      <Navigation className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1.5 md:mr-2" />
                      <span className="hidden sm:inline">Get Directions</span>
                      <span className="inline sm:hidden">Map</span>
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="border-slate-700 text-foreground hover:bg-slate-800 h-9 md:h-10">
                    <a href={`tel:${branch.phone.replace(/\s/g, "")}`}>
                      <Phone className="h-3.5 md:h-4 w-3.5 md:w-4" />
                      <span className="sr-only">Call</span>
                    </a>
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
