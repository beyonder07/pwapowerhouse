"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

type UserRole = "owner" | "trainer" | "client"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true

    async function redirectAuthenticatedUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        })
        const result = await response.json()

        if (mounted && response.ok && result.success) {
          router.replace(`/${result.data.user.role as UserRole}`)
        }
      } catch {
        // Anonymous users should stay on the login page.
      }
    }

    redirectAuthenticatedUser()

    return () => {
      mounted = false
    }
  }, [router])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = "Please enter your email address"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.password) {
      newErrors.password = "Please enter your password"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Invalid credentials")
      }

      const role = result.data.user.role as UserRole

      toast.success("Welcome back!", {
        description: `Redirecting to ${role} dashboard...`,
      })

      setTimeout(() => {
        router.replace(`/${role}`)
      }, 500)
    } catch (error) {
      toast.error("Unable to sign in", {
        description:
          error instanceof Error
            ? error.message
            : "Please check your email and password and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your PowerHouse Gym account"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            disabled={isLoading}
            className="bg-secondary border-border"
            autoComplete="email"
          />
          {errors.email && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-destructive"
            >
              {errors.email}
            </motion.p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              disabled={isLoading}
              className="bg-secondary border-border pr-10"
              autoComplete="current-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">
                {showPassword ? "Hide password" : "Show password"}
              </span>
            </Button>
          </div>
          {errors.password && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-destructive"
            >
              {errors.password}
            </motion.p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full tap-target"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          New to PowerHouse Gym?{" "}
          <Link href="/signup/client" className="text-primary hover:underline">
            Join as Member
          </Link>
        </p>
        <p className="text-sm text-muted-foreground">
          Want to train with us?{" "}
          <Link href="/signup/trainer" className="text-primary hover:underline">
            Apply as Trainer
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
