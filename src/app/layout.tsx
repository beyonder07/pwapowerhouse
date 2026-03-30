import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaProvider } from '../components/pwa-provider';

export const metadata: Metadata = {
  title: 'PowerHouse Gym',
  description: 'PowerHouse Gym - discipline, structure, and results.',
  applicationName: 'PowerHouse Gym',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    shortcut: '/icon-192.png',
    apple: '/apple-touch-icon.png'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PowerHouse Gym'
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#dc2626' },
    { media: '(prefers-color-scheme: light)', color: '#d92323' }
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
