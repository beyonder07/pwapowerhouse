import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "You're Offline",
  description: "It looks like you've lost your internet connection. Please check your network and try again.",
  robots: { index: false, follow: false },
}

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
