import type { Ref } from 'vue'
import { computed } from 'vue'

export interface Facility {
  type: string
  global_x: number
  global_y: number
  svg_active: string
}

export interface Region {
  full_name: string
  registration_x: number
  registration_y: number
  shape_d: string
  facilities: Facility[]
}

export interface Airport {
  regionKey: string
  regionName: string
  x: number
  y: number
  enabled: boolean
}

export interface FlightRoute {
  id: string
  from: Airport
  to: Airport
}

export function useAirportData(
  regions: Ref<Record<string, Region>>,
  enabledAirports: Ref<Set<string>>,
) {
  const airports = computed<Airport[]>(() => {
    const result: Airport[] = []
    for (const [key, region] of Object.entries(regions.value)) {
      for (const f of region.facilities) {
        if (f.type !== 'airport') continue
        const airportKey = `${key}:${f.global_x},${f.global_y}`
        result.push({
          regionKey: key,
          regionName: region.full_name,
          x: f.global_x,
          y: f.global_y,
          enabled: enabledAirports.value.has(airportKey),
        })
      }
    }
    return result
  })

  const activeAirports = computed(() => airports.value.filter(a => a.enabled))

  const routes = computed<FlightRoute[]>(() => {
    const active = activeAirports.value
    if (active.length < 2) return []
    const result: FlightRoute[] = []
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const from = active[i]!
        const to = active[j]!
        result.push({
          id: `${from.regionKey}-${to.regionKey}`,
          from,
          to,
        })
      }
    }
    return result
  })

  return { airports, activeAirports, routes }
}
