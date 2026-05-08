<script setup lang="ts">
import { onMounted, toRef } from 'vue'
import { useAirportData, type Region } from '~/utils/airports'
import { usePlaneAnimation } from '~/utils/planes'

const props = defineProps<{
  regions: Record<string, Region>
  enabledAirports: Set<string>
}>()

const { routes } = useAirportData(
  toRef(props, 'regions'),
  toRef(props, 'enabledAirports'),
)

const { planes, start } = usePlaneAnimation(() => routes.value)
onMounted(start)
</script>

<template>
  <g class="planes" pointer-events="none">
    <g
      v-for="plane in planes"
      :key="plane.id"
      :transform="`translate(${plane.x}, ${plane.y}) rotate(${plane.angle})`"
    >
      <g transform="translate(12.3, 12.3)">
        <path d="M8.65 -8.65 Q12.3 -5.1 12.3 0.0 12.3 5.1 8.65 8.65 7.2 10.2 5.45 11.05 3.0 12.3 0.0 12.3 -3.0 12.3 -5.45 11.05 -7.2 10.2 -8.65 8.65 -12.3 5.1 -12.3 0.0 -12.3 -5.1 -8.65 -8.65 L-6.8 -10.25 -5.4 -11.1 -2.95 -11.95 0.0 -12.3 Q5.1 -12.3 8.65 -8.65" fill="#313131" fill-rule="evenodd"/>
        <path d="M-0.1 -7.35 L3.35 0.0 9.6 0.0 M-0.1 7.35 L3.35 0.0 -6.8 0.0 -8.8 4.25 M-8.8 -4.25 L-6.8 0.0" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/>
      </g>
    </g>
  </g>
</template>
