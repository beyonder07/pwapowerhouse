import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Member Login",
  description:
    "Sign in to your PowerHouse Gym account. Access your workout plans, attendance, payments, and personal training dashboard.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
