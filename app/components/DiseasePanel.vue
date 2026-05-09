<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

interface Trait {
  name: string;
  active: boolean;
  tooltip: string;
}

interface Disease {
  name: string;
  type: string;
  evolutionPoints: number;
  avgInfectionsPerDay: number;
  avgDeathsPerDay: number;
  lethality: number;
  infectivity: number;
  visibility: number;
  symptoms: Trait[];
  resistances: Trait[];
  transmissions: Trait[];
  traits: Trait[];
}

const props = defineProps<{ disease: Disease }>();
defineEmits<{ close: [] }>();

const TIER_PREFIXES = ["COLD", "HEAT", "MOISTURE", "DRUG"];

function tierNum(name: string): number {
  const m = name.match(/\s+(I+)$/);
  return m ? m[1].length : 0;
}

function tierBase(name: string): string {
  return name.replace(/\s+I+$/, "");
}

function isTiered(name: string): boolean {
  return TIER_PREFIXES.some((p) => name.startsWith(p + " "));
}

const visibleResistances = computed(() => {
  const maxActive = new Map<string, number>();
  for (const r of props.disease.resistances) {
    if (!isTiered(r.name) || !r.active) continue;
    const base = tierBase(r.name);
    const tier = tierNum(r.name);
    if (tier > (maxActive.get(base) ?? 0)) maxActive.set(base, tier);
  }
  return props.disease.resistances.filter((r) => {
    if (!isTiered(r.name)) return true;
    const base = tierBase(r.name);
    const tier = tierNum(r.name);
    return tier <= (maxActive.get(base) ?? 0) + 1;
  });
});

const tooltip = ref<{ name: string; x: number; y: number } | null>(null);
const isTouch = ref(false);

function showTooltip(name: string, e: MouseEvent) {
  if (isTouch.value) return;
  const trait = [
    ...props.disease.symptoms,
    ...props.disease.resistances,
    ...props.disease.transmissions,
    ...props.disease.traits,
  ].find((t) => t.name === name);
  if (!trait?.tooltip) return;
  tooltip.value = { name, x: e.clientX, y: e.clientY };
}

function moveTooltip(e: MouseEvent) {
  if (!tooltip.value) return;
  tooltip.value = { ...tooltip.value, x: e.clientX, y: e.clientY };
}

function hideTooltip() {
  if (isTouch.value) return;
  tooltip.value = null;
}

function handleTap(name: string, e: MouseEvent) {
  const isTouchEvent =
    (e as PointerEvent).pointerType === "touch" ||
    !window.matchMedia("(hover: hover)").matches;

  if (isTouchEvent) {
    isTouch.value = true;
    const trait = [
      ...props.disease.symptoms,
      ...props.disease.resistances,
      ...props.disease.transmissions,
      ...props.disease.traits,
    ].find((t) => t.name === name);
    if (!trait?.tooltip) return;
    if (tooltip.value?.name === name) {
      tooltip.value = null;
    } else {
      tooltip.value = { name, x: e.clientX, y: e.clientY };
    }
  }
}

function handlePointerDown(e: PointerEvent) {
  if (e.pointerType === "touch") {
    isTouch.value = true;
  }
}

function handleDocumentClick(e: MouseEvent) {
  if (!isTouch.value || !tooltip.value) return;
  const target = e.target as Element;
  if (!target.closest(".trait-btn")) {
    tooltip.value = null;
  }
}

onMounted(() => document.addEventListener("click", handleDocumentClick, true));
onUnmounted(() => document.removeEventListener("click", handleDocumentClick, true));
</script>

<template>
  <PanelShell
    :title="disease.name"
    :subtitle="disease.type"
    wide
    @close="$emit('close')"
  >
    <div
      v-if="tooltip"
      class="cursor-tooltip"
      :style="{
        left: `clamp(8px, ${tooltip.x + 14}px, calc(100vw - 296px))`,
        top: `clamp(8px, ${tooltip.y + 18}px, calc(100vh - 120px))`,
      }"
    >
      <div class="cursor-tooltip-name">{{ tooltip.name }}</div>
      <div class="cursor-tooltip-body">
        {{
          [
            ...disease.symptoms,
            ...disease.resistances,
            ...disease.transmissions,
            ...disease.traits,
          ].find((t) => t.name === tooltip.name)?.tooltip
        }}
      </div>
    </div>

    <PanelSection label="SYMPTOMS" class="mb-5">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <button
          v-for="t in disease.symptoms"
          :key="t.name"
          class="trait-btn"
          :class="{ active: t.active }"
          @pointerdown="handlePointerDown"
          @click="handleTap(t.name, $event)"
          @mouseenter="showTooltip(t.name, $event)"
          @mousemove="moveTooltip"
          @mouseleave="hideTooltip"
        >
          {{ t.name }}
        </button>
      </div>
    </PanelSection>

    <div class="grid grid-cols-1 md:grid-cols-[1fr_210px_190px] gap-4 mb-5">
      <PanelSection label="RESISTANCE">
        <div class="resistance-grid">
          <div v-for="base in TIER_PREFIXES" :key="base" class="resistance-col">
            <button
              v-for="t in visibleResistances.filter(
                (r) => isTiered(r.name) && tierBase(r.name) === base,
              )"
              :key="t.name"
              class="trait-btn"
              :class="{ active: t.active }"
              @pointerdown="handlePointerDown"
              @click="handleTap(t.name, $event)"
              @mouseenter="showTooltip(t.name, $event)"
              @mousemove="moveTooltip"
              @mouseleave="hideTooltip"
            >
              {{ t.name }}
            </button>
          </div>
        </div>
      </PanelSection>

      <PanelSection label="TRANSMISSION">
        <div class="flex flex-col gap-3">
          <button
            v-for="t in disease.transmissions"
            :key="t.name"
            class="trait-btn"
            :class="{ active: t.active }"
            @pointerdown="handlePointerDown"
            @click="handleTap(t.name, $event)"
            @mouseenter="showTooltip(t.name, $event)"
            @mousemove="moveTooltip"
            @mouseleave="hideTooltip"
          >
            {{ t.name }}
          </button>
        </div>
      </PanelSection>

      <PanelSection label="TRAITS">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="t in disease.traits"
            :key="t.name"
            class="trait-btn"
            style="flex: 1 1 auto"
            :class="{ active: t.active }"
            @pointerdown="handlePointerDown"
            @click="handleTap(t.name, $event)"
            @mouseenter="showTooltip(t.name, $event)"
            @mousemove="moveTooltip"
            @mouseleave="hideTooltip"
          >
            {{ t.name }}
          </button>
        </div>
      </PanelSection>
    </div>

    <PanelSection label="DISEASE INFORMATION">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-3 mb-3">
        <div
          v-for="[label, val] in [
            ['EVOLUTION POINTS', disease.evolutionPoints],
            ['AVERAGE INFECTIONS A DAY', disease.avgInfectionsPerDay],
            ['AVERAGE DEATHS A DAY', disease.avgDeathsPerDay],
          ]"
          :key="label"
          class="flex items-baseline gap-2 flex-wrap"
        >
          <span class="font-bold tracking-wide text-[#ddd] uppercase">{{ label }}</span>
          <span class="text-[#888] font-bold">{{ val }}</span>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatBar
          v-for="[label, val] in [
            ['LETHALITY', disease.lethality],
            ['INFECTIVITY', disease.infectivity],
            ['VISIBILITY', disease.visibility],
          ]"
          :key="label"
          :label="label as string"
          :value="val as number"
        />
      </div>
    </PanelSection>
  </PanelShell>
</template>

<style scoped>
@container panel (max-width: 600px) {
  .trait-btn {
    font-size: 10px;
    padding: 3px 8px;
  }
}

@container panel (max-width: 400px) {
  .trait-btn {
    font-size: 9px;
    padding: 2px 6px;
  }
}

.trait-btn {
  position: relative;
  padding: 4px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  background: linear-gradient(180deg, #1a3a5c 0%, #0f2540 100%);
  color: rgba(80, 130, 165, 0.9);
  font-weight: 800;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  transition:
    background 0.1s,
    color 0.1s;
}
.trait-btn::before {
  content: "";
  position: absolute;
  top: 1px;
  left: 2px;
  right: 2px;
  height: calc(50% - 1px);
  background: rgba(255, 255, 255, 0.25);
  border-radius: 4px 4px 50% 50%;
  pointer-events: none;
  z-index: 1;
}
.trait-btn::after {
  content: none;
}
.trait-btn.active {
  background: linear-gradient(180deg, #3a7fd4 0%, #1a55a8 40%, #1060c0 100%);
  color: rgba(180, 215, 240, 0.9);
  font-weight: 800;
  box-shadow: 0 0 8px rgba(40, 100, 200, 0.4);
}
.trait-btn:hover {
  filter: brightness(1.15);
}

.resistance-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
}

.resistance-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

@media (max-width: 768px) {
  .resistance-col {
    flex-basis: calc(50% - 4px);
    flex-grow: 0;
  }
}

.resistance-col .trait-btn {
  width: 100%;
}

.cursor-tooltip {
  position: fixed;
  background: rgba(20, 20, 24, 0.96);
  border: 1px solid #555;
  border-radius: 4px;
  padding: 8px 10px;
  max-width: 280px;
  pointer-events: none;
  z-index: 200;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.cursor-tooltip-name {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #e8f4ff;
  text-transform: uppercase;
  margin-bottom: 3px;
}

.cursor-tooltip-body {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: #c8c8c8;
  line-height: 1.35;
}
</style>
