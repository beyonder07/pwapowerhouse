import Link from "next/link"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  href?: string
  showText?: boolean
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  textClassName?: string
}

const logoSizes = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
  xl: "h-16 w-16",
}

const textSizes = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
}

export function BrandLogo({
  href,
  showText = true,
  size = "md",
  className,
  textClassName,
}: BrandLogoProps) {
  const content = (
    <>
      <img
        src="/icons/icon-192.png"
        alt="PowerHouse Gym logo"
        className={cn(
          "shrink-0 rounded-xl border border-white/10 object-cover shadow-sm",
          logoSizes[size]
        )}
      />
      {showText && (
        <span
          className={cn(
            "font-bold text-foreground",
            textSizes[size],
            textClassName
          )}
        >
          Power<span className="text-primary">House</span>
        </span>
      )}
    </>
  )

  const classes = cn("inline-flex items-center gap-2", className)

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}
