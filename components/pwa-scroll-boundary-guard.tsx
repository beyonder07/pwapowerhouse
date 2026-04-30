"use client"

import { useEffect, useRef } from "react"

const SCROLL_CONTAINER_SELECTOR = ".page-scroll, .main-content"
const EDGE_SWIPE_ZONE_PX = 28

function nearestScrollContainer(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>(SCROLL_CONTAINER_SELECTOR)
}

function nearestScrollableElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null

  const appScrollContainer = nearestScrollContainer(target)
  if (appScrollContainer) return appScrollContainer

  let current: Element | null = target

  while (current && current !== document.body) {
    if (current instanceof HTMLElement) {
      const styles = window.getComputedStyle(current)
      const scrollsY = /(auto|scroll)/.test(styles.overflowY)

      if (scrollsY && canScroll(current)) return current
    }

    current = current.parentElement
  }

  return null
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

function normalizedWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return {
      x: event.deltaX * 16,
      y: event.deltaY * 16,
    }
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return {
      x: event.deltaX * window.innerWidth,
      y: event.deltaY * window.innerHeight,
    }
  }

  return {
    x: event.deltaX,
    y: event.deltaY,
  }
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

    const handleWheel = (event: WheelEvent) => {
      const { x, y } = normalizedWheelDelta(event)
      const absX = Math.abs(x)
      const absY = Math.abs(y)

      if (absX > 0 && absX >= absY) {
        event.preventDefault()
        return
      }

      const container = nearestScrollableElement(event.target)

      if (!container) {
        event.preventDefault()
        return
      }

      if (!canScroll(container)) {
        event.preventDefault()
        return
      }

      if ((y < 0 && isAtTop(container)) || (y > 0 && isAtBottom(container))) {
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
    document.addEventListener("wheel", handleWheel, {
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
      document.removeEventListener("wheel", handleWheel, {
        capture: true,
      })
    }
  }, [])

  return null
}
