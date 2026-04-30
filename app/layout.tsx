import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "PowerHouse Gym - Transform Your Body, Transform Your Life",
    template: "%s | PowerHouse Gym",
  },
  description:
    "Join PowerHouse Gym - Premium fitness facilities, expert trainers, and personalized workout plans. Two locations in the city. Start your transformation today.",
  keywords: [
    "gym",
    "fitness",
    "workout",
    "powerhouse",
    "training",
    "health",
    "exercise",
  ],
  authors: [{ name: "PowerHouse Gym" }],
  manifest: "/manifest.json",
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
  },
  formatDetection: {
    telephone: true,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "PowerHouse Gym",
    title: "PowerHouse Gym - Transform Your Body, Transform Your Life",
    description:
      "Premium fitness facilities, expert trainers, and personalized workout plans.",
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
    <html lang="en" className="dark bg-background">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased bg-background">
        <div id="root" className="app-root">
          {children}
        </div>
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Service Worker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('Service Worker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
