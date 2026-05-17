"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { MapPin, Loader2, Navigation, Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Gym {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
}

interface Props {
  currentGymId?: string | null
  onUpdate?: () => void
}

export function GymAssignmentManager({ currentGymId, onUpdate }: Props) {
  const [gyms, setGyms] = useState<Gym[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  useEffect(() => {
    fetchGyms()
  }, [])

  async function fetchGyms() {
    try {
      const response = await fetch("/api/gyms")
      const result = await response.json()
      if (result.success) setGyms(result.data)
    } catch (error) {
      console.error("Failed to fetch gyms", error)
    }
  }

  async function handleAutoAssign() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const response = await fetch(`/api/gyms/nearby?lat=${latitude}&lon=${longitude}`)
          const result = await response.json()

          if (!result.success) throw new Error(result.error)
          
          const nearbyGyms = result.data as Gym[]
          if (nearbyGyms.length === 0) {
            toast.error("No gyms found within your current vicinity")
          } else if (nearbyGyms.length === 1) {
            await assignGym(nearbyGyms[0].id, nearbyGyms[0].name)
          } else {
            toast.info(`Found ${nearbyGyms.length} gyms nearby. Please select one manually.`)
          }
        } catch (error: any) {
          toast.error("Nearby search failed", { description: error.message })
        } finally {
          setIsLocating(false)
        }
      },
      (error) => {
        toast.error("Unable to retrieve your location")
        setIsLocating(false)
      }
    )
  }

  async function assignGym(gymId: string, gymName: string) {
    setIsLoading(true)
    try {
      const response = await fetch("/api/gyms/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gymId }),
      })
      const result = await response.json()

      if (!result.success) throw new Error(result.error)

      toast.success(`Assigned to ${gymName}`)
      if (onUpdate) onUpdate()
    } catch (error: any) {
      toast.error("Assignment failed", { description: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const currentGym = gyms.find(g => g.id === currentGymId)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          {currentGym ? `Assigned to: ${currentGym.name}` : "Not assigned to any gym"}
        </p>
        <p className="text-xs text-muted-foreground">
          Auto-assign based on your location or choose manually.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoAssign}
          disabled={isLocating || isLoading}
        >
          {isLocating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="mr-2 h-4 w-4" />
          )}
          Find Nearby
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <MapPin className="mr-2 h-4 w-4" />
              {currentGym ? "Switch Gym" : "Choose Gym"}
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            {gyms.map((gym) => (
              <DropdownMenuItem
                key={gym.id}
                onClick={() => assignGym(gym.id, gym.name)}
                className="flex items-center justify-between"
              >
                {gym.name}
                {gym.id === currentGymId && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
