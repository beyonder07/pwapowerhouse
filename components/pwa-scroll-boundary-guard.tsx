"use client"

import { useEffect, useRef } from "react"

const SCROLL_CONTAINER_SELECTOR = ".page-scroll, .main-content"
const EDGE_SWIPE_ZONE_PX = 28

function nearestScrollContainer(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>(SCROLL_CONTAINER_SELECTOR)
}

function canScroll(container: HTMLElement) {
  return container.scrollHeight > container.clientHeight + 1
}

function isAtTop(container: HTMLElement) {
  return container.scrollTop <= 0
}

function isAtBottom(container: HTMLElement) {
  return (
    container.scrollTop + container.clientHeight >= container.scrollHeight - 1
  )
}

export function PwaScrollBoundaryGuard() {
  const touchStartRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return

      const touch = event.touches[0]
      if (!touch) return

      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      const viewportWidth = window.innerWidth
      const startedAtHorizontalEdge =
        touchStartRef.current.x <= EDGE_SWIPE_ZONE_PX ||
        touchStartRef.current.x >= viewportWidth - EDGE_SWIPE_ZONE_PX

      if (startedAtHorizontalEdge && absX > absY) {
        event.preventDefault()
        return
      }

      const container = nearestScrollContainer(event.target)

      if (!container) {
        event.preventDefault()
        return
      }

      if (!canScroll(container)) {
        event.preventDefault()
        return
      }

      const pullingDown = deltaY > 0
      const pushingUp = deltaY < 0

      if (
        (pullingDown && isAtTop(container)) ||
        (pushingUp && isAtBottom(container))
      ) {
        event.preventDefault()
      }
    }

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
      capture: true,
    })
    document.addEventListener("touchmove", handleTouchMove, {
      passive: false,
      capture: true,
    })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart, {
        capture: true,
      })
      document.removeEventListener("touchmove", handleTouchMove, {
        capture: true,
      })
    }
  }, [])

  return null
}
