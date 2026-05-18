import { Loader2 } from "lucide-react"

export default function WorkoutPlanLoading() {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
