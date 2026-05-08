import { ref, onUnmounted } from 'vue'
import type { FlightRoute } from './airports'

export interface PlaneState {
  id: string
  routeId: string
  x: number
  y: number
  angle: number
  progress: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  speed: number
}

const PLANE_SPEED = 0.00015
const SPAWN_INTERVAL_MS = 600

export function usePlaneAnimation(getRoutes: () => FlightRoute[]) {
  const planes = ref<PlaneState[]>([])
  let nextId = 0
  let lastSpawn = 0
  let rafId = 0
  let lastTime = 0

  function spawnPlane(route: FlightRoute) {
    const forward = Math.random() < 0.5
    const from = forward ? route.from : route.to
    const to = forward ? route.to : route.from
    const dx = to.x - from.x
    const dy = to.y - from.y
    const speed = PLANE_SPEED * (1 + (Math.random() * 2 - 1) * 0.3)
    planes.value.push({
      id: `plane-${nextId++}`,
      routeId: route.id,
      x: from.x,
      y: from.y,
      angle: Math.atan2(dy, dx) * (180 / Math.PI),
      progress: 0,
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      speed,
    })
  }

  function tick(timestamp: number) {
    const dt = lastTime === 0 ? 0 : timestamp - lastTime
    lastTime = timestamp

    const routes = getRoutes()

    if (routes.length > 0 && timestamp - lastSpawn > SPAWN_INTERVAL_MS) {
      const route = routes[Math.floor(Math.random() * routes.length)]!
      spawnPlane(route)
      lastSpawn = timestamp
    }

    const activeRouteIds = new Set(routes.map(r => r.id))

    planes.value = planes.value
      .filter(p => activeRouteIds.has(p.routeId) && p.progress < 1)
      .map(p => {
        const progress = Math.min(1, p.progress + p.speed * dt)
        return {
          ...p,
          progress,
          x: p.fromX + (p.toX - p.fromX) * progress,
          y: p.fromY + (p.toY - p.fromY) * progress,
        }
      })

    rafId = requestAnimationFrame(tick)
  }

  function start() {
    lastTime = 0
    lastSpawn = 0
    rafId = requestAnimationFrame(tick)
  }

  function stop() {
    cancelAnimationFrame(rafId)
  }

  onUnmounted(stop)

  return { planes, start, stop }
}
