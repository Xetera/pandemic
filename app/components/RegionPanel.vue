<script setup lang="ts">
interface Status {
  label: string;
  active: boolean;
}

interface CountryEntry {
  name: string;
  iso: string;
  confirmed: number;
  suspected: number;
  deaths: number;
  status: string;
}

interface RegionInfo {
  name: string;
  afflictions: Status[];
  governmentAffairs: Status[];
  services: Status[];
  population: { healthy: number; infected: number; suspected: number; dead: number; alive: number };
  countries: CountryEntry[];
}

defineProps<{ region: RegionInfo }>();
defineEmits<{ close: [] }>();

function fmt(n: number) {
  return n.toLocaleString();
}
</script>

<template>
  <PanelShell :title="region.name" subtitle="REGION INFORMATION" @close="$emit('close')">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <PanelSection label="AFFLICTIONS">
        <ul class="status-list">
          <li
            v-for="s in region.afflictions"
            :key="s.label"
            :class="['status-item', s.active ? 'active' : 'inactive']"
          >
            {{ s.label }}
          </li>
        </ul>
      </PanelSection>

      <PanelSection label="GOVERNMENT AFFAIRS">
        <ul class="status-list">
          <li
            v-for="s in region.governmentAffairs"
            :key="s.label"
            :class="['status-item', s.active ? 'active' : 'inactive']"
          >
            {{ s.label }}
          </li>
        </ul>
      </PanelSection>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PanelSection label="SERVICES & INFRASTRUCTURE">
        <ul class="status-list">
          <li
            v-for="s in region.services"
            :key="s.label"
            :class="['status-item', s.active ? 'active' : 'inactive']"
          >
            {{ s.label }}
          </li>
        </ul>
      </PanelSection>

      <PanelSection label="POPULATION">
        <ul class="pop-list">
          <li>
            <span class="pop-label">HEALTHY</span>
            <span class="pop-value">{{ fmt(region.population.healthy) }}</span>
          </li>
          <li>
            <span class="pop-label">INFECTED</span>
            <span class="pop-value">{{ fmt(region.population.infected) }}</span>
          </li>
          <li>
            <span class="pop-label">SUSPECTED</span>
            <span class="pop-value">{{ fmt(region.population.suspected) }}</span>
          </li>
          <li>
            <span class="pop-label">DEAD</span>
            <span class="pop-value">{{ fmt(region.population.dead) }}</span>
          </li>
          <li>
            <span class="pop-label">ALIVE</span>
            <span class="pop-value">{{ fmt(region.population.alive) }}</span>
          </li>
        </ul>
      </PanelSection>
    </div>

    <PanelSection v-if="region.countries.length" label="REPORTED COUNTRIES" class="mt-4">
      <ul class="country-list">
        <li v-for="c in region.countries" :key="c.iso" class="country-item">
          <div class="country-header">
            <span class="country-name">{{ c.name }}</span>
            <span class="country-stats">
              <span class="stat confirmed">{{ fmt(c.confirmed) }} confirmed</span>
              <span v-if="c.suspected" class="stat suspected">{{ fmt(c.suspected) }} suspected</span>
              <span v-if="c.deaths" class="stat dead">{{ fmt(c.deaths) }} dead</span>
            </span>
          </div>
          <p v-if="c.status" class="country-status">{{ c.status }}</p>
        </li>
      </ul>
    </PanelSection>
  </PanelShell>
</template>

<style scoped>
.status-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  font-size: 15px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 700;
}

.status-item.active {
  color: #e6e6e6;
}

.status-item.inactive {
  color: #5a5a5a;
}

.pop-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pop-list li {
  display: flex;
  gap: 12px;
  font-size: 15px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-weight: 700;
  color: #e6e6e6;
}

.pop-value {
  color: #cfd6dd;
  font-variant-numeric: tabular-nums;
}

.country-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.country-item {
  font-size: 13px;
  letter-spacing: 0.04em;
}

.country-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.country-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #e6e6e6;
}

.country-stats {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.stat {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
}

.stat.confirmed {
  color: #e6a020;
}

.stat.suspected {
  color: #8ab4d4;
}

.stat.dead {
  color: #c44;
}

.country-status {
  margin: 4px 0 0;
  font-size: 12px;
  color: #888;
  letter-spacing: 0.03em;
  line-height: 1.4;
  font-style: italic;
}
</style>
