"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Camera, FileCheck, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CameraCaptureModal } from "@/components/media/camera-capture-modal"
import { cn } from "@/lib/utils"

interface GovtIdPhotoUploadProps {
  imageUrl?: string | null
  uploadEndpoint: string
  disabled?: boolean
  onUploaded: (publicUrl: string) => void
}

export function GovtIdPhotoUpload({
  imageUrl,
  uploadEndpoint,
  disabled = false,
  onUploaded,
}: GovtIdPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, or WebP).")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo too large", { description: "Government ID photo must be under 5MB." })
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to upload government ID photo")
      }

      onUploaded(result.data.publicUrl as string)
      toast.success("Government ID photo uploaded")
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await uploadFile(file)
    e.target.value = ""
  }

  return (
    <div className="space-y-3 md:col-span-2">
      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
        Government ID Photo
      </Label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      <div
        className={cn(
          "rounded-xl border p-4 transition-all",
          imageUrl ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-secondary/20"
        )}
      >
        {imageUrl ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-32 overflow-hidden rounded-lg border border-border bg-black">
                <img src={imageUrl} alt="Government ID" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <FileCheck className="h-4 w-4 text-emerald-500" />
                  Government ID photo on file
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="mt-1 h-7 px-0 text-[10px] font-black uppercase tracking-widest hover:text-emerald-500"
                >
                  <a href={imageUrl} target="_blank" rel="noreferrer">
                    View full image
                  </a>
                </Button>
              </div>
            </div>

            {!disabled && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => setShowCamera(true)}
                  className="text-[10px] font-black uppercase tracking-widest"
                >
                  <Camera className="mr-2 h-3 w-3" />
                  Retake
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-black uppercase tracking-widest"
                >
                  <Upload className="mr-2 h-3 w-3" />
                  Replace
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2 text-center sm:flex-row sm:text-left">
            <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/50">
              <FileCheck className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Add your government ID photo</p>
              <p className="text-xs text-muted-foreground">
                Take a clear photo or upload JPG, PNG, or WebP (max 5MB).
              </p>
            </div>
            {!disabled && (
              <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => setShowCamera(true)}
                  className="text-[10px] font-black uppercase tracking-widest"
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-3 w-3" />
                  )}
                  Click Picture
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] font-black uppercase tracking-widest"
                >
                  <Upload className="mr-2 h-3 w-3" />
                  Upload File
                </Button>
              </div>
            )}
          </div>
        )}

        {isUploading && (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading...
          </p>
        )}
      </div>

      <CameraCaptureModal
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={uploadFile}
        title="Government ID Photo"
        facingMode="environment"
      />
    </div>
  )
}
