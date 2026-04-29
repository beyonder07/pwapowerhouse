"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

export default function OwnerSetupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    setupKey: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Please enter your full name"
    }

    if (!formData.email) {
      newErrors.email = "Please enter your email"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.phone) {
      newErrors.phone = "Please enter your phone number"
    }

    if (!formData.password) {
      newErrors.password = "Please enter a password"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (!formData.setupKey) {
      newErrors.setupKey = "Please enter the setup key"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/setup/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Setup failed")
      }

      toast.success("Owner account created!", {
        description: "Redirecting to your dashboard...",
      })

      setTimeout(() => {
        router.replace("/owner")
      }, 1000)
    } catch (error) {
      toast.error("Setup failed", {
        description:
          error instanceof Error
            ? error.message
            : "Invalid setup key or an error occurred.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Owner Setup"
      subtitle="Create the first owner account for PowerHouse Gym"
    >
      <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Private Setup</p>
            <p className="text-muted-foreground mt-0.5">
              This is a one-time setup for the gym owner. You will need the
              setup key provided during installation.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            disabled={isLoading}
            className="bg-secondary border-border"
          />
          {errors.fullName && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-destructive"
            >
              {errors.fullName}
            </motion.p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
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
            />
            {errors.email && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive"
              >
                {errors.email}
              </motion.p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="10-digit number"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              disabled={isLoading}
              className="bg-secondary border-border"
            />
            {errors.phone && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive"
              >
                {errors.phone}
              </motion.p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Choose a strong password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              disabled={isLoading}
              className="bg-secondary border-border pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          {errors.password && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-destructive"
            >
              {errors.password}
            </motion.p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            disabled={isLoading}
            className="bg-secondary border-border"
          />
          {errors.confirmPassword && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-destructive"
            >
              {errors.confirmPassword}
            </motion.p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="setupKey">Setup Key</Label>
          <Input
            id="setupKey"
            type="password"
            placeholder="Enter the setup key"
            value={formData.setupKey}
            onChange={(e) =>
              setFormData({ ...formData, setupKey: e.target.value })
            }
            disabled={isLoading}
            className="bg-secondary border-border"
          />
          {errors.setupKey && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-destructive"
            >
              {errors.setupKey}
            </motion.p>
          )}
          <p className="text-xs text-muted-foreground">
            This key was provided during the initial setup
          </p>
        </div>

        <Button
          type="submit"
          className="w-full tap-target"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Complete Setup"
          )}
        </Button>
      </form>
    </AuthLayout>
  )
}
