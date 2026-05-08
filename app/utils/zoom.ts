export interface Transform {
  k: number
  x: number
  y: number
  toString(): string
}

function makeTransform(k: number, x: number, y: number): Transform {
  return {
    k, x, y,
    toString() { return `translate(${this.x},${this.y}) scale(${this.k})` },
  }
}

export const identityTransform: Transform = makeTransform(1, 0, 0)

interface ZoomOptions {
  scaleExtent: [number, number]
  translateExtent: [[number, number], [number, number]]
  onStart?: () => void
  onZoom: (t: Transform) => void
  onEnd?: () => void
}

export function attachZoom(el: SVGSVGElement, initial: Transform, opts: ZoomOptions) {
  let t = initial
  const [minK, maxK] = opts.scaleExtent
  const [[x0, y0], [x1, y1]] = opts.translateExtent

  let mapGroup: SVGGElement | null = null
  let rafId = 0

  function getGroup(): SVGGElement | null {
    if (!mapGroup) mapGroup = el.querySelector('g') as SVGGElement | null
    return mapGroup
  }

  function clamp(next: Transform): Transform {
    const k = Math.max(minK, Math.min(maxK, next.k))
    const maxTx = -x0 * k
    const minTx = el.clientWidth - x1 * k
    const maxTy = -y0 * k
    const minTy = el.clientHeight - y1 * k
    const x = Math.max(minTx, Math.min(maxTx, next.x))
    const y = Math.max(minTy, Math.min(maxTy, next.y))
    return makeTransform(k, x, y)
  }

  function applyDirect(next: Transform) {
    t = clamp(next)
    const g = getGroup()
    if (g) g.setAttribute('transform', t.toString())
  }

  function flush() {
    opts.onZoom(t)
  }

  function scheduleFlush() {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      flush()
    })
  }

  function apply(next: Transform) {
    applyDirect(next)
    scheduleFlush()
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    const k = Math.max(minK, Math.min(maxK, t.k * factor))
    const x = mx - (mx - t.x) * (k / t.k)
    const y = my - (my - t.y) * (k / t.k)
    apply(makeTransform(k, x, y))
  }

  let pointers = new Map<number, PointerEvent>()
  let lastPinchDist = 0
  let totalMovement = 0
  let wasDrag = false

  function pinchDist(a: PointerEvent, b: PointerEvent) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }

  function pinchMid(a: PointerEvent, b: PointerEvent) {
    const rect = el.getBoundingClientRect()
    return {
      x: (a.clientX + b.clientX) / 2 - rect.left,
      y: (a.clientY + b.clientY) / 2 - rect.top,
    }
  }

  function onPointerDown(e: PointerEvent) {
    pointers.set(e.pointerId, e)
    totalMovement = 0
    wasDrag = false
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [PointerEvent, PointerEvent]
      lastPinchDist = pinchDist(a, b)
    }
    opts.onStart?.()
    flush()
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return
    const prev = pointers.get(e.pointerId)!
    pointers.set(e.pointerId, e)

    const dx = e.clientX - prev.clientX
    const dy = e.clientY - prev.clientY
    totalMovement += Math.hypot(dx, dy)
    if (totalMovement > 8) wasDrag = true

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [PointerEvent, PointerEvent]
      const dist = pinchDist(a, b)
      const factor = dist / lastPinchDist
      lastPinchDist = dist
      const mid = pinchMid(a, b)
      const k = Math.max(minK, Math.min(maxK, t.k * factor))
      const x = mid.x - (mid.x - t.x) * (k / t.k)
      const y = mid.y - (mid.y - t.y) * (k / t.k)
      applyDirect(makeTransform(k, x, y))
    } else {
      applyDirect(makeTransform(t.k, t.x + dx, t.y + dy))
    }
    scheduleFlush()
  }

  function onPointerUp(e: PointerEvent) {
    pointers.delete(e.pointerId)
    if (pointers.size === 0) {
      flush()
      opts.onEnd?.()
    }
  }

  function onClick(e: MouseEvent) {
    if (wasDrag) {
      e.stopPropagation()
      wasDrag = false
    }
  }

  el.addEventListener("wheel", onWheel, { passive: false })
  el.addEventListener("pointerdown", onPointerDown)
  el.addEventListener("click", onClick, { capture: true })
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  function translateTo(mapX: number, mapY: number) {
    const cx = el.clientWidth / 2
    const cy = el.clientHeight / 2
    apply(makeTransform(t.k, cx - mapX * t.k, cy - mapY * t.k))
  }

  function setTransform(next: Transform) {
    t = next
    opts.onZoom(t)
  }

  return {
    translateTo,
    setTransform,
    destroy() {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("pointerdown", onPointerDown)
      el.removeEventListener("click", onClick, { capture: true })
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
    },
  }
}

export function makeInitialTransform(
  width: number,
  height: number,
  mapW: number,
  mapH: number,
  mapTop: number,
): { fitScale: number; t: Transform } {
  const visibleH = mapH - mapTop
  const fitScale = Math.max(width / mapW, height / visibleH)
  const initX = (width - mapW * fitScale) / 2
  const initY = -mapTop * fitScale
  return { fitScale, t: makeTransform(fitScale, initX, initY) }
}
