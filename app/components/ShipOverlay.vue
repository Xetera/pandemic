<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useShipAnimation, NODES, SHIPYARDS } from "~/utils/ships";

const { ships, start } = useShipAnimation();
const debug = import.meta.client && new URLSearchParams(window.location.search).has("debug");
onMounted(start);

function nearestNodeIdx(pt: { x: number; y: number }): number {
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < NODES.length; i++) {
    const dx = pt.x - NODES[i]!.x, dy = pt.y - NODES[i]!.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
const seen = new Set<string>();
for (let i = 0; i < NODES.length; i++) {
  for (const j of NODES[i]!.edges) {
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ x1: NODES[i]!.x, y1: NODES[i]!.y, x2: NODES[j]!.x, y2: NODES[j]!.y });
  }
}
for (const yard of SHIPYARDS) {
  const ni = nearestNodeIdx(yard);
  edges.push({ x1: yard.x, y1: yard.y, x2: NODES[ni]!.x, y2: NODES[ni]!.y });
}
</script>

<template>
  <g class="ships" pointer-events="none">
    <template v-if="debug">
      <line
        v-for="(e, i) in edges"
        :key="i"
        :x1="e.x1"
        :y1="e.y1"
        :x2="e.x2"
        :y2="e.y2"
        stroke="rgba(80,80,255,0.45)"
        stroke-width="3"
        stroke-dasharray="10,7"
      />
    </template>
    <g
      v-for="ship in ships"
      :key="ship.id"
      :transform="`translate(${ship.x}, ${ship.y})`"
    >
      <g>
        <path d="M8.65 -8.65 Q12.3 -5.1 12.3 0.0 12.3 5.1 8.65 8.65 7.2 10.2 5.45 11.05 3.0 12.3 0.0 12.3 -3.0 12.3 -5.45 11.05 -7.2 10.2 -8.65 8.65 -12.3 5.1 -12.3 0.0 -12.3 -5.1 -8.65 -8.65 L-6.8 -10.25 -5.4 -11.1 -2.95 -11.95 0.0 -12.3 Q5.1 -12.3 8.65 -8.65" fill="#0000cc" fill-rule="evenodd"/>
        <path d="M0.0 -6.35 L0.0 -1.65 4.85 -1.65 M7.35 5.55 L0.0 7.55 -7.35 5.55 M0.0 7.55 L0.0 -1.65 -4.85 -1.65 M-1.35 -7.55 L1.35 -7.55" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/>
      </g>
    </g>
  </g>
</template>
