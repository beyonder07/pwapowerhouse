"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, CheckCircle, Upload, X } from "lucide-react"
import { toast } from "sonner"

interface BranchOption {
  id: string
  name: string
}

export default function ClientSignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBranches, setIsLoadingBranches] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    branch: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true

    async function loadBranches() {
      try {
        const response = await fetch("/api/branches", { cache: "no-store" })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Unable to load branches")
        }

        if (mounted) {
          setBranches(result.data.branches)
        }
      } catch (error) {
        toast.error("Could not load branches", {
          description:
            error instanceof Error
              ? error.message
              : "Please refresh the page and try again.",
        })
      } finally {
        if (mounted) {
          setIsLoadingBranches(false)
        }
      }
    }

    loadBranches()

    return () => {
      mounted = false
    }
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image too large", {
          description: "Please select an image under 5MB.",
        })
        return
      }
      setProfileImage(file)
      setProfilePreview(URL.createObjectURL(file))
    }
  }

  const removeImage = () => {
    setProfileImage(null)
    if (profilePreview) {
      URL.revokeObjectURL(profilePreview)
      setProfilePreview(null)
    }
  }

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
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number"
    }

    if (!formData.branch) {
      newErrors.branch = "Please select a branch"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/requests/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          branchId: formData.branch,
        }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not submit request")
      }

      setIsSuccess(true)
    } catch (error) {
      toast.error("Could not submit request", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Request Submitted"
        subtitle="Thank you for your interest in PowerHouse Gym"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4 sm:space-y-6"
        >
          <div className="flex justify-center">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-7 sm:h-8 w-7 sm:w-8 text-emerald-500" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm sm:text-base text-foreground font-medium">
              Your membership request has been received!
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Our team will review your application and contact you at{" "}
              <span className="text-foreground break-all">{formData.phone}</span> within
              24-48 hours to complete your registration.
            </p>
          </div>
          <div className="pt-2 sm:pt-4 space-y-2 sm:space-y-3">
            <Button asChild variant="outline" className="w-full h-9 sm:h-10 text-sm sm:text-base">
              <Link href="/">Return to Homepage</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Join PowerHouse Gym"
      subtitle="Start your fitness journey with us"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Profile Image */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm">Profile Photo (Optional)</Label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <AnimatePresence mode="wait">
              {profilePreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative"
                >
                  <img
                    src={profilePreview}
                    alt="Profile preview"
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover border-2 border-primary"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </motion.div>
              ) : (
                <motion.label
                  key="upload"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors tap-target"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="sr-only"
                    disabled={isLoading}
                  />
                </motion.label>
              )}
            </AnimatePresence>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Upload a clear photo</p>
              <p>Max 5MB, JPG or PNG</p>
            </div>
          </div>
        </div>

        {/* Full Name */}
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

        {/* Email */}
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

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="10-digit mobile number"
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

        {/* Branch Selection */}
        <div className="space-y-2">
          <Label>Preferred Branch</Label>
          <Select
            value={formData.branch}
            onValueChange={(value) =>
              setFormData({ ...formData, branch: value })
            }
            disabled={isLoading}
          >
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue
                placeholder={
                  isLoadingBranches ? "Loading branches..." : "Select a branch"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.branch && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-destructive"
            >
              {errors.branch}
            </motion.p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full tap-target"
          disabled={isLoading || isLoadingBranches}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Membership Request"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Already a member?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
