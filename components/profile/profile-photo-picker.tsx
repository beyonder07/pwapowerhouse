"use client"

import { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Eye, Loader2, Maximize2, Minimize2, Upload, X, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CameraCaptureModal } from "@/components/media/camera-capture-modal"
import { cn } from "@/lib/utils"

interface ProfilePhotoPickerProps {
  name: string
  imageUrl?: string | null
  isUploading?: boolean
  onUpload: (file: File) => void | Promise<void>
}

export function ProfilePhotoPicker({
  name,
  imageUrl,
  isUploading = false,
  onUpload,
}: ProfilePhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPicOptions, setShowPicOptions] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isViewerMinimized, setIsViewerMinimized] = useState(false)
  const [isViewerMaximized, setIsViewerMaximized] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  const handleFile = async (file: File) => {
    setShowPicOptions(false)
    await onUpload(file)
  }

  const openPhotoViewer = () => {
    setShowPicOptions(false)
    setIsViewerOpen(true)
    setIsViewerMinimized(false)
    setIsViewerMaximized(false)
    setZoomLevel(1)
  }

  const closePhotoViewer = () => {
    setIsViewerOpen(false)
    setIsViewerMinimized(false)
    setIsViewerMaximized(false)
    setZoomLevel(1)
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ""
        }}
      />

      <div className="relative">
        <button
          type="button"
          className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-secondary overflow-hidden border-2 border-border hover:border-primary transition-all cursor-pointer shadow-xl"
          onClick={() => setShowPicOptions(!showPicOptions)}
          aria-label="Profile photo options"
        >
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <motion.div className="flex h-full w-full items-center justify-center bg-primary/10 text-3xl font-black text-primary">
              {name[0]?.toUpperCase()}
            </motion.div>
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </button>

        <AnimatePresence>
          {showPicOptions && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-1/2 z-20 mt-3 w-44 -translate-x-1/2 rounded-xl border border-border bg-card p-1 shadow-2xl"
              >
                <button
                  type="button"
                  onClick={openPhotoViewer}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-black uppercase tracking-widest transition-colors hover:bg-secondary"
                >
                  <Eye className="h-4 w-4 text-primary" />
                  View Image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPicOptions(false)
                    setShowCamera(true)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-black uppercase tracking-widest transition-colors hover:bg-secondary"
                >
                  <Camera className="h-4 w-4 text-primary" />
                  Click Picture
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPicOptions(false)
                    fileInputRef.current?.click()
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-black uppercase tracking-widest transition-colors hover:bg-secondary"
                >
                  <Upload className="h-4 w-4 text-primary" />
                  Choose Image
                </button>
              </motion.div>
              <button
                type="button"
                className="fixed inset-0 z-10"
                aria-label="Close photo options"
                onClick={() => setShowPicOptions(false)}
              />
            </>
          )}
        </AnimatePresence>
      </div>

      <CameraCaptureModal
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleFile}
        title="Profile Photo"
        facingMode="user"
      />

      <AnimatePresence>
        {isViewerOpen &&
          (isViewerMinimized ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              className="fixed bottom-4 right-4 z-[120] w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="truncate text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Profile Photo
                </p>
                <motion.div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsViewerMinimized(false)}
                    className="h-8 w-8"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={closePhotoViewer}
                    className="h-8 w-8 text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
              <button
                type="button"
                onClick={() => setIsViewerMinimized(false)}
                className="block h-36 w-full overflow-hidden rounded-xl bg-secondary"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/10 text-5xl font-black text-primary">
                    {name[0]?.toUpperCase()}
                  </div>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
            >
              <div className="absolute right-4 top-4 z-[130] flex flex-wrap items-center justify-end gap-2 sm:right-6 sm:top-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsViewerMinimized(true)}
                  className="text-white hover:bg-white/10"
                >
                  <Minimize2 className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsViewerMaximized((c) => !c)
                    setZoomLevel(1)
                  }}
                  className="text-white hover:bg-white/10"
                >
                  <Maximize2 className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoomLevel((p) => Math.max(0.5, p - 0.25))}
                  className="text-white hover:bg-white/10"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setZoomLevel((p) => Math.min(3, p + 0.25))}
                  className="text-white hover:bg-white/10"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={closePhotoViewer}
                  className="text-red-500 hover:bg-red-500/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <motion.div
                className={cn(
                  "relative z-[110] flex items-center justify-center",
                  isViewerMaximized
                    ? "h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)]"
                    : "h-[min(76dvh,48rem)] w-[min(92vw,48rem)]"
                )}
                initial={{ scale: 0.92 }}
                animate={{ scale: zoomLevel }}
                drag={!isViewerMaximized}
                dragMomentum={false}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name}
                    className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
                  />
                ) : (
                  <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-primary/20 text-9xl font-black text-primary">
                    {name[0]?.toUpperCase()}
                  </div>
                )}
              </motion.div>
            </motion.div>
          ))}
      </AnimatePresence>
    </>
  )
}
