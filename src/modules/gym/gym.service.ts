import type { AuthContext } from "@/src/middleware/auth.middleware"
import { createSupabaseServiceRoleClient } from "@/src/services/supabase.service"

export interface Gym {
  id: string
  name: string
  latitude: number
  longitude: number
  radius: number
}

export class GymService {
  constructor(private readonly ctx: AuthContext) {}

  async getAllGyms(): Promise<Gym[]> {
    const { data, error } = await this.ctx.supabase
      .from("gyms")
      .select("*")
      .order("name")

    if (error) throw error
    return data || []
  }

  async findNearbyGyms(lat: number, lon: number): Promise<Gym[]> {
    const { data, error } = await this.ctx.supabase.rpc("find_nearby_gyms", {
      p_lat: lat,
      p_lon: lon
    })

    if (!error) return data || []

    // Fallback: Fetch all and calculate in JS
    const gyms = await this.getAllGyms()
    return gyms.filter(gym => {
      const distance = this.calculateDistance(lat, lon, gym.latitude, gym.longitude)
      return distance <= gym.radius
    })
  }

  async assignGym(gymId: string) {
    const serviceClient = createSupabaseServiceRoleClient()
    const { error } = await serviceClient
      .from("users")
      .update({ gym_id: gymId })
      .eq("id", this.ctx.user.id)

    if (error) throw error
    return { success: true }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // metres
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }
}
