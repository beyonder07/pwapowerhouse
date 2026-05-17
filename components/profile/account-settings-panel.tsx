"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react"
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
import { PageIntro, SurfaceCard } from "@/components/powerhouse"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { GymAssignmentManager } from "@/components/gym/gym-assignment-manager"
import { ProfilePhotoPicker } from "@/components/profile/profile-photo-picker"
import { GovtIdPhotoUpload } from "@/components/profile/govt-id-photo-upload"
import { cn } from "@/lib/utils"

interface UserProfile {
  user: {
    id: string
    name: string
    email: string
    role: string
    gym_id?: string
  }
  details: {
    phone?: string
    govt_id_url?: string
    govt_id_type?: string
    govt_id_number?: string
    profile_pic_url?: string
  } | null
}

export interface AccountSettingsConfig {
  profileApi: string
  avatarApi: string
  govtIdApi: string
  verifiedBadge: string
  bannerText?: string
}

export function AccountSettingsPanel({ config }: { config: AccountSettingsConfig }) {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPic, setIsUploadingPic] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    govtIdType: "",
    govtIdNumber: "",
    password: "",
  })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  async function loadProfile() {
    setLoadFailed(false)
    try {
      const response = await fetch(config.profileApi, { credentials: "include" })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error)
      setProfile(result.data)
      setFormData({
        name: result.data.user.name,
        phone: result.data.details?.phone || "",
        govtIdType: result.data.details?.govt_id_type || "",
        govtIdNumber: result.data.details?.govt_id_number || "",
        password: "",
      })
    } catch {
      setLoadFailed(true)
      toast.error("Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [config.profileApi])

  const handleProfilePicUpload = async (file: File) => {
    if (!profile) return
    setIsUploadingPic(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch(config.avatarApi, {
        method: "POST",
        credentials: "include",
        body,
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to upload profile picture")
      }
      const publicUrl = result.data.publicUrl as string
      setProfile((prev) =>
        prev
          ? { ...prev, details: { ...(prev.details || {}), profile_pic_url: publicUrl } }
          : null
      )
      toast.success("Profile picture updated")
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsUploadingPic(false)
    }
  }

  async function handleUpdateProfile() {
    if (!formData.password) {
      toast.error("Password Required")
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch(config.profileApi, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: formData.name,
          phone: formData.phone || null,
          govtIdType: formData.govtIdType || null,
          govtIdNumber: formData.govtIdNumber || null,
          govtIdUrl: profile?.details?.govt_id_url || null,
          profilePicUrl: profile?.details?.profile_pic_url || null,
          currentPassword: formData.password,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "Failed to update profile")
      }
      toast.success("Profile Updated")
      setEditMode(false)
      setShowPasswordModal(false)
      setFormData((p) => ({ ...p, password: "" }))
      await loadProfile()
    } catch (error) {
      toast.error("Update Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    router.replace("/login")
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (loadFailed || !profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">Could not load your profile.</p>
        <Button onClick={() => { setIsLoading(true); void loadProfile() }}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {config.bannerText ? (
        <div className="bg-primary p-2 text-center text-[10px] font-black uppercase tracking-[0.3em] text-primary-foreground">
          {config.bannerText}
        </div>
      ) : null}

      <PageIntro
        title="Account Settings"
        subtitle="Manage your identity and security preferences"
      />

      <SurfaceCard
        className={cn(
          "transition-all duration-300",
          editMode && "border-primary/50 shadow-xl shadow-primary/10"
        )}
      >
        <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <ProfilePhotoPicker
            name={profile?.user.name || "?"}
            imageUrl={profile?.details?.profile_pic_url}
            isUploading={isUploadingPic}
            onUpload={handleProfilePicUpload}
          />
          <div className="w-full flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{profile?.user.name}</h2>
                <p className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:justify-start">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {config.verifiedBadge}
                </p>
              </div>
              <Button
                variant={editMode ? "ghost" : "outline"}
                size="sm"
                onClick={() => {
                  if (editMode) {
                    setEditMode(false)
                    void loadProfile()
                  } else {
                    setEditMode(true)
                  }
                }}
                className="h-8 px-6 text-[10px] font-bold uppercase tracking-widest"
              >
                {editMode ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 border-t border-border/30 pt-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Full Name
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              readOnly={!editMode}
              className={cn(
                "h-11 bg-secondary/30 font-bold transition-all",
                editMode && "border-primary bg-background"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Mobile Number
            </Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                readOnly={!editMode}
                className={cn(
                  "h-11 bg-secondary/30 pl-10 font-bold transition-all",
                  editMode && "border-primary bg-background"
                )}
                placeholder="10-digit number"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Government ID Type
            </Label>
            <Select
              value={formData.govtIdType || "none"}
              onValueChange={(v) =>
                setFormData({ ...formData, govtIdType: v === "none" ? "" : v })
              }
              disabled={!editMode}
            >
              <SelectTrigger
                className={cn(
                  "h-11 bg-secondary/30 font-bold transition-all",
                  editMode && "border-primary bg-background"
                )}
              >
                <SelectValue placeholder="Select ID Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>
                  Select ID Type
                </SelectItem>
                <SelectItem value="aadhar">Aadhar Card</SelectItem>
                <SelectItem value="pan">PAN Card</SelectItem>
                <SelectItem value="license">Driver&apos;s License</SelectItem>
                <SelectItem value="other">Other Identity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Government ID Number
            </Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={formData.govtIdNumber}
                onChange={(e) => setFormData({ ...formData, govtIdNumber: e.target.value })}
                readOnly={!editMode}
                className={cn(
                  "h-11 bg-secondary/30 pl-10 font-bold transition-all",
                  editMode && "border-primary bg-background"
                )}
                placeholder="Enter ID number"
              />
            </div>
          </div>

          <GovtIdPhotoUpload
            imageUrl={profile?.details?.govt_id_url}
            uploadEndpoint={config.govtIdApi}
            disabled={!editMode}
            onUploaded={(publicUrl) => {
              setProfile((prev) =>
                prev
                  ? {
                      ...prev,
                      details: { ...(prev.details || {}), govt_id_url: publicUrl },
                    }
                  : null
              )
            }}
          />
        </div>

        {editMode ? (
          <div className="mt-8 flex justify-end border-t border-border/50 pt-6">
            <Button
              onClick={() => setShowPasswordModal(true)}
              className="h-11 gap-2 px-10 font-black shadow-xl shadow-primary/20"
            >
              <ShieldCheck className="h-5 w-5" />
              COMMIT CHANGES
            </Button>
          </div>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <div className="mb-8 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Account Security</h2>
        </div>
        <ChangePasswordForm />
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 md:flex-row">
          <div className="text-center md:text-left">
            <p className="font-bold">Active Branch</p>
            <p className="text-xs text-muted-foreground">Manage your training facility.</p>
          </div>
          <GymAssignmentManager currentGymId={profile?.user.gym_id} onUpdate={loadProfile} />
        </div>
        <div className="mt-8 flex justify-end border-t border-border/30 pt-8">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-red-500/20 px-8 text-[10px] font-bold uppercase text-red-500 hover:bg-red-500/10"
          >
            Sign Out
          </Button>
        </div>
      </SurfaceCard>

      <AnimatePresence>
        {showPasswordModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-2xl"
            >
              <h3 className="text-center text-2xl font-black">Confirm Identity</h3>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                placeholder="Current Password"
                autoFocus
              />
              <div className="flex gap-4">
                <Button variant="ghost" className="flex-1" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 font-black"
                  onClick={handleUpdateProfile}
                  disabled={isSaving}
                >
                  VERIFY & SAVE
                </Button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
