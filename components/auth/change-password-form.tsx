"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, ShieldCheck, Mail, Lock, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from "@/components/ui/input-otp"

export function ChangePasswordForm() {
  const [step, setStep] = useState<1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [otp, setOtp] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }

    if (oldPassword === newPassword) {
      toast.error("New password cannot be the same as old password")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ oldPassword }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to send OTP")
      }

      toast.success("OTP sent!", {
        description: "Old password verified. Check your email for the code.",
      })
      setStep(2)
    } catch (error: any) {
      toast.error("Verification failed", {
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirmChange(e: React.FormEvent) {
    e.preventDefault()
    
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp, newPassword }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Verification failed")
      }

      toast.success("Password updated successfully")
      setStep(1)
      setOtp("")
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast.error("Change failed", {
        description: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 1) {
    return (
      <form onSubmit={handleRequestOtp} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old-password">Current Password</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="old-password"
                type="password"
                placeholder="Enter current password"
                className="pl-10"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  className="pl-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Verify new password"
                  className="pl-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-2">
          <p className="text-sm text-muted-foreground max-w-xs">
            Confirming will verify your old password and send a 6-digit OTP to your email.
          </p>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send OTP & Verify
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleConfirmChange} className="space-y-6">
      <div className="space-y-2">
        <Label>Verification Code</Label>
        <div className="flex justify-center md:justify-start">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => setOtp(value)}
            disabled={isLoading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter the 6-digit code sent to your email to finalize the change.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isLoading || otp.length < 6}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Finalize Password Change
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep(1)}
          disabled={isLoading}
        >
          Back
        </Button>
      </div>
    </form>
  )
}
