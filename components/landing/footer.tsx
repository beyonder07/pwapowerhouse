"use client"

import Link from "next/link"
import { Phone, Mail, MapPin, Instagram, Facebook, Youtube } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"

const footerLinks = {
  quickLinks: [
    { href: "#why", label: "Why Us" },
    { href: "#branches", label: "Our Branches" },
    { href: "#plans", label: "Membership Plans" },
    { href: "#facilities", label: "Facilities" },
  ],
  support: [
    { href: "/login", label: "Member Login" },
    { href: "/signup/client", label: "Join Now" },
    { href: "/signup/trainer", label: "Become a Trainer" },
    { href: "/forgot-password", label: "Reset Password" },
  ],
}

export function Footer() {
  return (
    <footer className="bg-slate-950/90 border-t border-slate-800 backdrop-blur-[2px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <BrandLogo href="/" size="lg" className="mb-4" />
            <p className="text-sm text-slate-400 mb-6">
              Transform your body, transform your life. Premium fitness facilities 
              with expert guidance.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5 text-slate-400 hover:text-accent" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5 text-slate-400 hover:text-accent" />
              </a>
              <a
                href="#"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5 text-slate-400 hover:text-accent" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Support</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-400">
                  Indira Chowk & Pathik Chowk (Rajendra Complex)
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-accent flex-shrink-0" />
                <a
                  href="tel:+919411009196"
                  className="text-sm text-slate-400 hover:text-accent"
                >
                  +91 9411009196 / 8077411696
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-accent flex-shrink-0" />
                <a
                  href="mailto:suryanshgym@gmail.com"
                  className="text-sm text-slate-400 hover:text-accent"
                >
                  suryanshgym@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} PowerHouse Gym. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="#"
                className="text-sm text-slate-400 hover:text-accent transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-sm text-slate-400 hover:text-accent transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
