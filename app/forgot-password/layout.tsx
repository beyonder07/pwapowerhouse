import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forgot Password",
  description:
    "Reset your PowerHouse Gym account password. Enter your registered email to receive a secure reset link.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/forgot-password" },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
