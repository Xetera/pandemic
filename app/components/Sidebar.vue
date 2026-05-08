<script setup lang="ts">
import { ref, computed } from "vue";
import type { Transform } from "~/utils/zoom";

const props = defineProps<{
  transform: Transform;
  mapWidth: number;
  mapHeight: number;
  mapTop: number;
  viewportWidth: number;
  viewportHeight: number;
  news: { date: string; text: string; url: string; source: string }[];
}>();

const emit = defineEmits<{ panTo: [{ x: number; y: number }] }>();

const open = ref(false);
const minimapEl = ref<SVGSVGElement | null>(null);
const minimapHovered = ref(false);
const minimapDragging = ref(false);

const viewportFillOpacity = computed(() => {
  if (minimapDragging.value) return 0.302;
  if (minimapHovered.value) return 0.2;
  return 0.122;
});

const viewportStrokeOpacity = computed(() => {
  if (minimapDragging.value) return 1;
  if (minimapHovered.value) return 0.749;
  return 0.62;
});

const viewportStrokeColor = computed(() =>
  minimapDragging.value ? "#db1515" : "#ba1212"
);

const visibleH = computed(() => props.mapHeight - props.mapTop);

const viewport = computed(() => {
  const { k, x: tx, y: ty } = props.transform;
  const svgW = Math.min(props.viewportWidth, 1920);
  const x = -tx / k;
  const y = -ty / k;
  const w = svgW / k;
  const h = props.viewportHeight / k;
  return { x, y, w, h };
});

function clientToMap(clientX: number, clientY: number) {
  const svg = minimapEl.value!;
  const rect = svg.getBoundingClientRect();
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  return {
    x: fx * props.mapWidth,
    y: props.mapTop + fy * visibleH.value,
  };
}

function onMinimapPointerDown(e: PointerEvent) {
  e.preventDefault();
  const target = e.target as Element;
  target.setPointerCapture?.(e.pointerId);

  const grabMap = clientToMap(e.clientX, e.clientY);
  const { x: vpX, y: vpY, w: vpW, h: vpH } = viewport.value;
  const offsetX = grabMap.x - (vpX + vpW / 2);
  const offsetY = grabMap.y - (vpY + vpH / 2);

  let dragging = false;
  const startX = e.clientX;
  const startY = e.clientY;

  const onMove = (ev: PointerEvent) => {
    if (!dragging) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.sqrt(dx * dx + dy * dy) < 4) return;
      dragging = true;
      minimapDragging.value = true;
    }
    const p = clientToMap(ev.clientX, ev.clientY);
    emit("panTo", { x: p.x - offsetX, y: p.y - offsetY });
  };
  const onUp = (ev: PointerEvent) => {
    minimapDragging.value = false;
    target.releasePointerCapture?.(ev.pointerId);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}
</script>

<template>
  <button
    class="sidebar-toggle"
    @click="open = !open"
    :aria-expanded="open"
    aria-label="Toggle sidebar"
  >
    <span class="bar" />
    <span class="bar" />
    <span class="bar" />
  </button>

  <aside class="sidebar" :class="{ open }">
    <div class="minimap-wrap">
      <svg
        ref="minimapEl"
        class="minimap"
        :viewBox="`0 ${mapTop} ${mapWidth} ${visibleH}`"
        preserveAspectRatio="xMidYMid meet"
        @pointerdown="onMinimapPointerDown"
        @pointerenter="minimapHovered = true"
        @pointerleave="minimapHovered = false"
      >
        <defs>
          <clipPath id="minimap-clip">
            <rect :x="0" :y="mapTop" :width="mapWidth" :height="visibleH" />
          </clipPath>
        </defs>
        <image
          href="/minimap.svg"
          :x="-((mapWidth * 10.8) / 176)"
          :y="mapTop - (visibleH * 10.75) / 108"
          :width="(mapWidth * 195.85) / 176"
          :height="(visibleH * 128.05) / 108"
          preserveAspectRatio="none"
          clip-path="url(#minimap-clip)"
        />
        <rect
          :x="Math.max(0, viewport.x)"
          :y="Math.max(mapTop, viewport.y)"
          :width="Math.max(0, Math.min(mapWidth, viewport.x + viewport.w) - Math.max(0, viewport.x))"
          :height="Math.max(0, Math.min(mapTop + visibleH, viewport.y + viewport.h) - Math.max(mapTop, viewport.y))"
          fill="#ff0000"
          :fill-opacity="viewportFillOpacity"
          :stroke="viewportStrokeColor"
          :stroke-opacity="viewportStrokeOpacity"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
      </svg>
    </div>

    <div class="news">
      <div class="news-header">BREAKING NEWS</div>
      <ul class="news-list">
        <li v-for="(item, i) in news" :key="i" class="news-item">
          <a
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="news-link"
            data-umami-event="news-click"
            :data-umami-event-source="item.source"
          >
            <span class="news-source">{{ item.source }}</span>
            <span class="news-date">{{ item.date }}</span>
            {{ item.text }}
          </a>
        </li>
        <li class="italic font-medium attribution -mt-3!">
          Data: hantavirus.one (CC BY 4.0).
          <a target="_blank" href="https://hantavirus.one/"
            >https://hantavirus.one/</a
          >
        </li>
      </ul>
    </div>
  </aside>

  <div v-if="open" class="sidebar-backdrop" @click="open = false" />
</template>

<style scoped>
.sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 260px;
  max-width: 80vw;
  height: calc(100% - 44px);
  background: rgba(8, 30, 64, 0.55);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  z-index: 30;
  font-family: "Source Sans 3", sans-serif;
  color: #d6e4f5;
  user-select: none;
  pointer-events: auto;
}

.minimap-wrap {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.minimap {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  cursor: crosshair;
  touch-action: none;
}


.news {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.news-header {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #999;
  text-align: center;
  padding: 10px 12px;
  background: linear-gradient(
    180deg,
    #5a5a5a 0%,
    #2e2e2e 4%,
    #1a1a1a 18%,
    #111111 60%,
    #1c1c1c 100%
  );
  border-top: 1px solid #888;
  border-bottom: 1px solid #000;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.news-list {
  list-style: none;
  margin: 0;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.news-item {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.35;
  color: #d6e4f5;
}

.news-source {
  display: block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #8ab4d4;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.news-date {
  display: block;
  font-size: 12px;
  color: #4a7a9e;
  margin-bottom: 3px;
  letter-spacing: 0.1em;
}

.news-list::-webkit-scrollbar {
  width: 4px;
}

.news-list::-webkit-scrollbar-track {
  background: transparent;
}

.news-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.news-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.news-link:hover {
  color: #fff;
}

.attribution {
  margin-top: 6px;
  padding-top: 6px;
}

.squiggle {
  display: block;
  width: 100%;
  height: 6px;
  margin-bottom: 4px;
  color: rgba(214, 228, 245, 0.4);
}

.sidebar-toggle {
  display: none;
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 60;
  width: 38px;
  height: 38px;
  background: rgba(8, 30, 64, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 0;
}

.sidebar-toggle .bar {
  display: block;
  width: 18px;
  height: 2px;
  background: #d6e4f5;
}

.sidebar-backdrop {
  display: none;
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 25;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    width: 240px;
    z-index: 40;
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar-toggle {
    display: flex;
  }
  .sidebar-toggle[aria-expanded="true"] {
    display: none;
  }
  .sidebar-backdrop {
    display: block;
  }
}
</style>
