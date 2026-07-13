import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { AppVersionManager } from "@/components/app-version-manager"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { PwaScrollBoundaryGuard } from "@/components/pwa-scroll-boundary-guard"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "PowerHouse Gym Budaun | Best Gym in Budaun Since 1999",
    template: "%s | PowerHouse Gym Budaun",
  },
  description:
    "PowerHouse Gym Budaun — Certified personal training, nutrition guidance, and premium fitness facilities since 1999. Two branches: Indira Chowk & Pathik Chowk. Join today, first session free.",
  keywords: [
    "gym in Budaun",
    "best gym Budaun",
    "personal trainer Budaun",
    "fitness center Budaun",
    "PowerHouse Gym",
    "gym near me Budaun",
    "weight loss gym Budaun",
    "muscle gain training Budaun",
    "certified nutritionist Budaun",
    "Indira Chowk gym",
    "Pathik Chowk gym",
    "gym Budaun UP",
    "fitness trainer Budaun",
    "body transformation Budaun",
    "workout center Budaun",
  ],
  authors: [{ name: "PowerHouse Gym", url: "https://pwapowerhouse.vercel.app" }],
  creator: "PowerHouse Gym",
  publisher: "PowerHouse Gym",
  manifest: "/manifest.json",
  metadataBase: new URL("https://pwapowerhouse.vercel.app"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PowerHouse Gym",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "geo.region": "IN-UP",
    "geo.placename": "Budaun",
    "geo.position": "28.0320;79.1316",
    "ICBM": "28.0320, 79.1316",
  },
  formatDetection: {
    telephone: true,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://pwapowerhouse.vercel.app",
    siteName: "PowerHouse Gym Budaun",
    title: "PowerHouse Gym Budaun | Best Gym in Budaun Since 1999",
    description:
      "Certified personal training & nutrition coaching at PowerHouse Gym, Budaun. Two premium branches. First session free — walk in today.",
    images: [
      {
        url: "/training-area.png",
        width: 1200,
        height: 630,
        alt: "PowerHouse Gym Budaun — Training Floor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PowerHouse Gym Budaun | Best Gym Since 1999",
    description:
      "Certified personal training & nutrition coaching in Budaun. Join PowerHouse Gym — first session free.",
    images: ["/training-area.png"],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-background" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HealthClub",
              "name": "PowerHouse Gym",
              "alternateName": "PowerHouse Gym Budaun",
              "description": "Certified personal training and nutrition coaching in Budaun since 1999. Two branches: Indira Chowk and Pathik Chowk.",
              "url": "https://pwapowerhouse.vercel.app",
              "logo": "https://pwapowerhouse.vercel.app/brand/powerhouse-logo.jpg",
              "image": "https://pwapowerhouse.vercel.app/training-area.png",
              "foundingDate": "1999",
              "priceRange": "₹₹",
              "currenciesAccepted": "INR",
              "paymentAccepted": "Cash, UPI",
              "telephone": ["+91-9411009196", "+91-8077411696"],
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Indira Chowk, Main Road",
                "addressLocality": "Budaun",
                "addressRegion": "Uttar Pradesh",
                "postalCode": "243601",
                "addressCountry": "IN",
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 28.0320613,
                "longitude": 79.1316603,
              },
              "openingHoursSpecification": [
                {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
                  "opens": "05:00",
                  "closes": "23:00",
                },
              ],
              "department": [
                {
                  "@type": "HealthClub",
                  "name": "PowerHouse Gym — Indira Chowk",
                  "telephone": "+91-9411009196",
                  "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Civil Lines, near MY MART, Indira Chowk",
                    "addressLocality": "Budaun",
                    "addressRegion": "Uttar Pradesh",
                    "postalCode": "243601",
                    "addressCountry": "IN",
                  },
                },
                {
                  "@type": "HealthClub",
                  "name": "PowerHouse Gym — Pathik Chowk (Rajendra Complex)",
                  "telephone": "+91-8077411696",
                  "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Rajendra Complex, Pathik Chowk",
                    "addressLocality": "Budaun",
                    "addressRegion": "Uttar Pradesh",
                    "postalCode": "243601",
                    "addressCountry": "IN",
                  },
                },
              ],
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Gym Memberships",
                "itemListElement": [
                  {
                    "@type": "Offer",
                    "name": "Personal Training Plan",
                    "price": "1499",
                    "priceCurrency": "INR",
                    "description": "1-on-1 personal trainer sessions, custom workout plan, certified nutrition guidance, meal chart, and weekly progress check-ins.",
                  },
                  {
                    "@type": "Offer",
                    "name": "Advanced Personal Training",
                    "description": "Goal-based fully bespoke training programme with certified nutrition plan. Pricing based on assessment.",
                  },
                ],
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "120",
              },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background">
        <ThemeProvider>
          <div id="root" className="app-root">
            <AppVersionManager />
            <PwaScrollBoundaryGuard />
            {children}
          </div>
        </ThemeProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "oklch(0.15 0.01 260)",
              border: "1px solid oklch(0.28 0.01 260)",
              color: "oklch(0.98 0 0)",
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
