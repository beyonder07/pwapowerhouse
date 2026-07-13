import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Join as Member — Start Your Free Trial",
  description:
    "Sign up for PowerHouse Gym Budaun. Get access to personal training, certified nutrition guidance, and premium gym facilities. First session is completely free.",
  keywords: [
    "join gym Budaun",
    "gym membership Budaun",
    "free trial gym Budaun",
    "sign up PowerHouse Gym",
    "gym registration Budaun",
  ],
  alternates: { canonical: "/signup/client" },
  openGraph: {
    title: "Join PowerHouse Gym Budaun — First Session Free",
    description:
      "Start your fitness journey at PowerHouse Gym, Budaun. Personal training + certified nutrition. Sign up today, first session is on us.",
    url: "https://pwapowerhouse.vercel.app/signup/client",
  },
}

export default function SignupClientLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
