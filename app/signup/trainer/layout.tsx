import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Apply as Trainer",
  description:
    "Join the PowerHouse Gym Budaun team as a certified personal trainer. Apply today and coach members across our two premium branches.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/signup/trainer" },
}

export default function SignupTrainerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
