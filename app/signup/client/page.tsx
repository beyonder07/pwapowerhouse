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
import { Loader2, CheckCircle, Upload, X, ShieldCheck, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface BranchOption {
  id: string
  name: string
}

export default function ClientSignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBranches, setIsLoadingBranches] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [govtIdUrl, setGovtIdUrl] = useState("")
  const [isUploadingGovtId, setIsUploadingGovtId] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    branch: "",
    govtIdType: "",
    govtIdNumber: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    async function loadBranches() {
      try {
        const response = await fetch("/api/branches", { cache: "no-store" })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error || "Unable to load branches")
        if (mounted) setBranches(result.data.branches)
      } catch (error) {
        toast.error("Could not load branches")
      } finally {
        if (mounted) setIsLoadingBranches(false)
      }
    }
    loadBranches()
    return () => { mounted = false }
  }, [])

  const handleGovtIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingGovtId(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `govt-id-${Date.now()}.${fileExt}`
      const filePath = `onboarding/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath)

      setGovtIdUrl(publicUrl)
      toast.success("ID proof uploaded successfully")
    } catch (error: any) {
      toast.error("Upload failed", { description: error.message })
    } finally {
      setIsUploadingGovtId(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.fullName.trim()) newErrors.fullName = "Full name required"
    if (!formData.email) {
      newErrors.email = "Email required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }
    if (!formData.phone) {
      newErrors.phone = "Phone number required"
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number"
    }
    if (!formData.password) {
      newErrors.password = "Password required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }
    if (!formData.branch) newErrors.branch = "Branch required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error("Please complete all required fields")
      return
    }
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
          password: formData.password,
          govtIdUrl: govtIdUrl || null,
          govtIdType: formData.govtIdType || null,
          govtIdNumber: formData.govtIdNumber || null,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Submission failed")
      setIsSuccess(true)
    } catch (error: any) {
      toast.error("Submission failed", { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout title="Request Submitted" subtitle="Welcome to the PowerHouse Family">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-emerald-500" />
          </div>
          <p className="text-foreground">Your request is being reviewed. We will create your account and you can log in as soon as the owner approves.</p>
          <Button asChild className="w-full"><Link href="/">Home</Link></Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Request Membership" subtitle="Submit your details — you can set your password now for immediate login upon approval">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Enter full name" />
            {errors.fullName ? <p className="text-xs text-red-500">{errors.fullName}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="you@example.com" />
            {errors.email ? <p className="text-xs text-red-500">{errors.email}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="10-digit number" />
            {errors.phone ? <p className="text-xs text-red-500">{errors.phone}</p> : null}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder="Choose a strong password (min 6 chars)"
                className="pr-10"
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
            {errors.password ? <p className="text-xs text-red-500">{errors.password}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label>Branch</Label>
            <Select value={formData.branch} onValueChange={v => setFormData({...formData, branch: v})}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select Branch" /></SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.branch ? <p className="text-xs text-red-500">{errors.branch}</p> : null}
          </div>

          {/* Govt ID Multi-Field Section */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <Label className="flex items-center gap-2 text-muted-foreground/80">
              <ShieldCheck className="h-4 w-4 text-primary/60" />
              Government ID Details (Optional)
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID Type</Label>
                <Select value={formData.govtIdType} onValueChange={v => setFormData({...formData, govtIdType: v})}>
                  <SelectTrigger className="h-9 text-xs w-full"><SelectValue placeholder="Select Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aadhar">Aadhar Card</SelectItem>
                    <SelectItem value="pan">PAN Card</SelectItem>
                    <SelectItem value="license">Driver's License</SelectItem>
                    <SelectItem value="other">Other ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID Number</Label>
                <Input 
                  value={formData.govtIdNumber} 
                  onChange={e => setFormData({...formData, govtIdNumber: e.target.value})}
                  className="h-9 text-xs" 
                  placeholder="Enter ID number"
                />
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-xl border-2 border-dashed transition-all",
              govtIdUrl ? "bg-emerald-500/5 border-emerald-500/20" : "bg-secondary/50 border-border"
            )}>
              {govtIdUrl ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold">
                    <CheckCircle className="h-3 w-3" />
                    DOCUMENT UPLOADED
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setGovtIdUrl("")} className="h-7 text-[10px] text-muted-foreground hover:text-red-500">Change</Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest text-center">Optional: Upload Image (Max 5MB)</p>
                  <input type="file" accept="image/*,application/pdf" id="govt-id" className="hidden" onChange={handleGovtIdUpload} disabled={isUploadingGovtId} />
                  <Button asChild variant="secondary" size="sm" className="w-full h-8" disabled={isUploadingGovtId}>
                    <label htmlFor="govt-id" className="cursor-pointer">
                      {isUploadingGovtId ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Upload className="h-3 w-3 mr-2" />}
                      {isUploadingGovtId ? "Uploading..." : "Select Document"}
                    </label>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full h-11 font-bold shadow-lg shadow-primary/10" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Submit Membership Request
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground font-medium underline underline-offset-4 decoration-border">Already a member? <Link href="/login" className="text-primary font-bold">Sign in</Link></p>
    </AuthLayout>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}
