import { ref, onUnmounted } from 'vue'

interface Pt { x: number; y: number }

export interface ShipNode {
  x: number
  y: number
  edges: number[]
}

export const NODES: ShipNode[] = [
  { x: -96.8,  y: 969.3,  edges: [30, 1] },
  { x: 153.8,  y: 1195.1, edges: [0, 2] },
  { x: 369.7,  y: 1580.1, edges: [1, 3] },
  { x: 472.1,  y: 1878.8, edges: [2, 4] },
  { x: 730.1,  y: 2310.6, edges: [3, 5] },
  { x: 1002.9, y: 2678.5, edges: [4, 6, 13] },
  { x: 1478.8, y: 1858.2, edges: [5, 12, 7, 10] },
  { x: 963.1,  y: 1305.3, edges: [10, 6, 8] },
  { x: 1261.0, y: 1007.2, edges: [9, 10, 7] },
  { x: 1478.8, y: 969.3,  edges: [10, 8, 14, 11] },
  { x: 1318.2, y: 1305.3, edges: [6, 7, 8, 9, 11] },
  { x: 1541.3, y: 1177.2, edges: [10, 9] },
  { x: 1762.6, y: 2108.4, edges: [6, 13] },
  { x: 1948.7, y: 2430.1, edges: [5, 18] },
  { x: 1783.1, y: 793.9,  edges: [9, 15] },
  { x: 1864.3, y: 641.0,  edges: [17, 16, 14] },
  { x: 1458.3, y: 558.5,  edges: [30, 15] },
  { x: 2400.5, y: 625.6,  edges: [15, 19] },
  { x: 2442.7, y: 2142.3, edges: [29, 13, 26] },
  { x: 3122.9, y: 641.0,  edges: [20, 17] },
  { x: 3683.9, y: 811.8,  edges: [21, 19] },
  { x: 3403.4, y: 1367.0, edges: [22, 20] },
  { x: 3704.4, y: 1878.8, edges: [23, 21] },
  { x: 3631.8, y: 2271.4, edges: [25, 22] },
  { x: 3663.6, y: 2451.9, edges: [25] },
  { x: 3348.8, y: 2503.6, edges: [24, 26, 23] },
  { x: 2955.7, y: 2255.9, edges: [18, 25, 27] },
  { x: 2911.8, y: 1843.2, edges: [28, 29, 26] },
  { x: 2857.3, y: 1660.5, edges: [29, 27] },
  { x: 2593.0, y: 1688.2, edges: [28, 18, 27] },
  { x: 258.8,  y: 620.5,  edges: [0, 16] },
]

export const SHIPYARDS: Pt[] = [
  { x: 729.85,  y: 1445.55 },
  { x: 3670.8,  y: 2380.4  },
  { x: 3075.0,  y: 2250.3  },
  { x: 2372.55, y: 771.5   },
  { x: 3130.05, y: 786.5   },
  { x: 2302.55, y: 2046.5  },
  { x: 2976.6,  y: 1789.05 },
  { x: 2923.1,  y: 1548.4  },
  { x: 2621.35, y: 1537.1  },
  { x: 3280.5,  y: 1306.45 },
  { x: 2410.0,  y: 1492.75 },
  { x: 1862.7,  y: 862.05  },
  { x: 1620.0,  y: 1187.3  },
  { x: 1522.9,  y: 1422.1  },
  { x: 1882.4,  y: 2060.85 },
  { x: 1406.5,  y: 841.95  },
  { x: 1238.9,  y: 1834.05 },
  { x: 869.4,   y: 2292.2  },
  { x: 454.9,   y: 1508.5  },
  { x: 296.8,   y: 1197.1  },
  { x: 822.1,   y: 1272.15 },
  { x: 359.0,   y: 1046.05 },
  { x: 1123.9,  y: 1003.1  },
]

export interface ShipState {
  id: string
  x: number
  y: number
  angle: number
  progress: number
  from: Pt
  to: Pt
  waypoints: Pt[]
  waypointIdx: number
}

const SHIP_SPEED = 40
const SPAWN_INTERVAL_MS = 4000

function dist(a: Pt, b: Pt) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function nearestNodeIdx(pt: Pt): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < NODES.length; i++) {
    const d = dist(pt, NODES[i]!)
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}

function buildWaypoints(srcYard: Pt, dstYard: Pt): Pt[] {
  const srcNodeIdx = nearestNodeIdx(srcYard)
  const dstNodeIdx = nearestNodeIdx(dstYard)

  const waypoints: Pt[] = [srcYard]
  const recent: number[] = []
  let cur = srcNodeIdx

  waypoints.push(NODES[cur]!)

  while (cur !== dstNodeIdx) {
    const curNode = NODES[cur]!
    const dstNode = NODES[dstNodeIdx]!

    if (dist(curNode, dstNode) <= 5) break

    let best = -1
    let bestDist = Infinity

    for (const edgeIdx of curNode.edges) {
      if (recent.includes(edgeIdx)) continue
      const d = dist(NODES[edgeIdx]!, dstNode)
      if (d < bestDist) { bestDist = d; best = edgeIdx }
    }

    if (best === -1) {
      for (const edgeIdx of curNode.edges) {
        const d = dist(NODES[edgeIdx]!, dstNode)
        if (d < bestDist) { bestDist = d; best = edgeIdx }
      }
    }

    if (best === -1 || waypoints.length > 64) break

    recent.push(cur)
    if (recent.length > 5) recent.shift()
    cur = best
    waypoints.push(NODES[cur]!)
  }

  waypoints.push(dstYard)
  return waypoints
}

export function useShipAnimation() {
  const ships = ref<ShipState[]>([])
  let nextId = 0
  let lastSpawn = 0
  let rafId = 0
  let lastTime = 0

  function spawnShip() {
    const srcIdx = Math.floor(Math.random() * SHIPYARDS.length)
    let dstIdx = Math.floor(Math.random() * SHIPYARDS.length)
    while (dstIdx === srcIdx) dstIdx = Math.floor(Math.random() * SHIPYARDS.length)

    const waypoints = buildWaypoints(SHIPYARDS[srcIdx]!, SHIPYARDS[dstIdx]!)
    if (waypoints.length < 2) return

    const from = waypoints[0]!
    const to = waypoints[1]!
    ships.value.push({
      id: `ship-${nextId++}`,
      x: from.x,
      y: from.y,
      angle: Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI),
      progress: 0,
      from,
      to,
      waypoints,
      waypointIdx: 0,
    })
  }

  function tick(timestamp: number) {
    const dt = lastTime === 0 ? 0 : timestamp - lastTime
    lastTime = timestamp

    if (timestamp - lastSpawn > SPAWN_INTERVAL_MS) {
      spawnShip()
      lastSpawn = timestamp
    }

    ships.value = ships.value.flatMap((s) => {
      const segLen = dist(s.from, s.to)
      const step = segLen > 0 ? (SHIP_SPEED * dt) / (segLen * 1000) : 0
      const progress = s.progress + step

      if (progress >= 1) {
        const nextIdx = s.waypointIdx + 1
        if (nextIdx + 1 >= s.waypoints.length) return []
        const from = s.waypoints[nextIdx]!
        const to = s.waypoints[nextIdx + 1]!
        return [{
          ...s,
          waypointIdx: nextIdx,
          progress: 0,
          from,
          to,
          x: from.x,
          y: from.y,
          angle: Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI),
        }]
      }

      return [{
        ...s,
        progress,
        angle: Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x) * (180 / Math.PI),
        x: s.from.x + (s.to.x - s.from.x) * progress,
        y: s.from.y + (s.to.y - s.from.y) * progress,
      }]
    })

    rafId = requestAnimationFrame(tick)
  }

  function start() {
    lastTime = 0
    lastSpawn = 0
    rafId = requestAnimationFrame(tick)
  }

  onUnmounted(() => cancelAnimationFrame(rafId))

  return { ships, start }
}
