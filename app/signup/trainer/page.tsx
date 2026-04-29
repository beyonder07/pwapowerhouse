"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

const specializations = [
  "Weight Training",
  "Cardio & HIIT",
  "CrossFit",
  "Yoga",
  "Bodybuilding",
  "Functional Training",
  "Personal Training",
  "Group Classes",
]

export default function TrainerSignupPage() {
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
    specialization: "",
    experience: "",
    about: "",
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
      newErrors.branch = "Please select your preferred branch"
    }

    if (!formData.specialization) {
      newErrors.specialization = "Please select your specialization"
    }

    if (!formData.experience) {
      newErrors.experience = "Please enter your experience"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const openToAnyBranch = formData.branch === "any"
      const response = await fetch("/api/requests/trainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          branchId: openToAnyBranch ? null : formData.branch,
          openToAnyBranch,
          specialization: formData.specialization,
          experience: formData.experience,
          about: formData.about,
        }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not submit application")
      }

      setIsSuccess(true)
    } catch (error) {
      toast.error("Could not submit application", {
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
        title="Application Submitted"
        subtitle="Thank you for applying to PowerHouse Gym"
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
              Your trainer application has been received!
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Our team will review your application and contact you at{" "}
              <span className="text-foreground break-all">{formData.phone}</span> within
              3-5 business days for the next steps.
            </p>
          </div>
          <div className="pt-2 sm:pt-4 space-y-2 sm:space-y-3">
            <Button asChild variant="outline" className="w-full h-9 sm:h-10 text-sm sm:text-base">
              <Link href="/">Return to Homepage</Link>
            </Button>
          </div>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Apply as Trainer"
      subtitle="Join our team of fitness professionals"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {/* Profile Image */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm">Profile Photo</Label>
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
              <p>Upload a professional photo</p>
              <p>Max 5MB, JPG or PNG</p>
            </div>
          </div>
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-xs sm:text-sm">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            disabled={isLoading}
            className="bg-secondary border-border text-sm"
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

        {/* Email & Phone Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={isLoading}
              className="bg-secondary border-border text-sm"
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
            <Label htmlFor="phone" className="text-xs sm:text-sm">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="10-digit number"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              disabled={isLoading}
              className="bg-secondary border-border text-sm"
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

        {/* Specialization & Experience */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Specialization</Label>
            <Select
              value={formData.specialization}
              onValueChange={(value) =>
                setFormData({ ...formData, specialization: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {specializations.map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.specialization && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive"
              >
                {errors.specialization}
              </motion.p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience" className="text-xs sm:text-sm">Experience</Label>
            <Input
              id="experience"
              type="text"
              placeholder="e.g., 3 years"
              value={formData.experience}
              onChange={(e) =>
                setFormData({ ...formData, experience: e.target.value })
              }
              disabled={isLoading}
              className="bg-secondary border-border text-sm"
            />
            {errors.experience && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-destructive"
              >
                {errors.experience}
              </motion.p>
            )}
          </div>
        </div>

        {/* Branch Selection */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm">Preferred Branch</Label>
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
              <SelectItem value="any">Open to all locations</SelectItem>
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

        {/* About */}
        <div className="space-y-2">
          <Label htmlFor="about" className="text-xs sm:text-sm">About You (Optional)</Label>
          <Textarea
            id="about"
            placeholder="Tell us about your training philosophy, certifications, achievements..."
            value={formData.about}
            onChange={(e) =>
              setFormData({ ...formData, about: e.target.value })
            }
            disabled={isLoading}
            className="bg-secondary border-border min-h-[100px] text-sm"
          />
        </div>

        <Button
          type="submit"
          className="w-full tap-target h-9 sm:h-10 text-sm sm:text-base"
          disabled={isLoading || isLoadingBranches}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Want to join as a member?{" "}
          <Link href="/signup/client" className="text-primary hover:underline">
            Sign up here
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
