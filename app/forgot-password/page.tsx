"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not send reset email")
      }

      setIsSuccess(true)
      toast.success("Password reset email sent")
    } catch (err) {
      toast.error("Could not send reset email", {
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title={isSuccess ? "Check Your Email" : "Forgot Password"}
      subtitle={
        isSuccess
          ? "Supabase has sent a secure password reset link"
          : "Enter your email and we will send a reset link"
      }
    >
      {isSuccess ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="text-foreground break-all">{email}</span>, a reset
            link will arrive shortly.
          </p>
          <Button asChild className="w-full tap-target">
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </motion.div>
      ) : (
        <motion.form
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="bg-secondary border-border"
              autoComplete="email"
            />
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive"
              >
                {error}
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
                Sending reset link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </motion.form>
      )}
    </AuthLayout>
  )
}
