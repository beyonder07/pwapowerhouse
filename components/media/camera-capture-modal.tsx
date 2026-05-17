"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Loader2, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CameraCaptureModalProps {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
  title?: string
  facingMode?: "user" | "environment"
}

export function CameraCaptureModal({
  open,
  onClose,
  onCapture,
  title = "Take Photo",
  facingMode = "user",
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFacing, setActiveFacing] = useState<"user" | "environment">(facingMode)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    setIsStarting(true)
    setError(null)
    stopStream()

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera is not supported on this device or browser.")
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: activeFacing } },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (err) {
      const message =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera permission in your browser settings."
          : err instanceof Error
            ? err.message
            : "Unable to start the camera."
      setError(message)
    } finally {
      setIsStarting(false)
    }
  }, [activeFacing, stopStream])

  useEffect(() => {
    if (open) {
      setActiveFacing(facingMode)
    }
  }, [open, facingMode])

  useEffect(() => {
    if (!open) {
      stopStream()
      setError(null)
      return
    }

    void startCamera()

    return () => {
      stopStream()
    }
  }, [open, activeFacing, startCamera, stopStream])

  const handleCapture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        })
        onCapture(file)
        stopStream()
        onClose()
      },
      "image/jpeg",
      0.92
    )
  }

  const handleClose = () => {
    stopStream()
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <motion.div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
                aria-label="Close camera"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>

            <div className="relative aspect-[4/3] bg-black">
              {isStarting && (
                <motion.div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </motion.div>
              )}

              {error ? (
                <motion.div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void startCamera()}>
                    Try Again
                  </Button>
                </motion.div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "h-full w-full object-cover",
                    activeFacing === "user" && "scale-x-[-1]"
                  )}
                />
              )}
            </div>

            <motion.div className="flex items-center justify-between gap-3 border-t border-border p-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setActiveFacing((current) => (current === "user" ? "environment" : "user"))
                }
                disabled={!!error || isStarting}
                className="gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <RefreshCw className="h-4 w-4" />
                Flip
              </Button>
              <Button
                type="button"
                onClick={handleCapture}
                disabled={!!error || isStarting}
                className="gap-2 font-black uppercase tracking-widest"
              >
                <Camera className="h-4 w-4" />
                Capture
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
