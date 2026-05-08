<script setup lang="ts">
interface WorldInfo {
  alivePopulation: number;
  deadPopulation: number;
  healthyPopulation: number;
  infectedPopulation: number;
  diseaseStart: Date;
  startingRegion: string;
  totalHospitals: number;
  activeHospitals: number;
  daysToCompletion: number;
  vaccineCompletion: number;
  vaccineDeployment: number;
  cleanRegions: string[];
  infectedRegions: string[];
  forsakenRegions: string[];
}

defineProps<{ world: WorldInfo }>();
defineEmits<{ close: [] }>();

function fmt(n: number) {
  return n.toLocaleString();
}
</script>

<template>
  <PanelShell title="WORLD INFORMATION" @close="$emit('close')" wide>
    <PanelSection label="WORLD INFORMATION" class="mb-5">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-3">
        <div
          v-for="[label, val] in [
            ['ALIVE POPULATION', fmt(world.alivePopulation)],
            ['DEAD POPULATION', fmt(world.deadPopulation)],
            ['HEALTHY POPULATION', fmt(world.healthyPopulation)],
            ['INFECTED POPULATION', fmt(world.infectedPopulation)],
            ['DISEASE START DATE', world.diseaseStart.toLocaleDateString('en-US')],
            ['DAYS THAT HAVE PASSED', Math.floor((Date.now() - world.diseaseStart.getTime()) / 86_400_000)],
          ]"
          :key="label"
          class="flex items-baseline gap-2 flex-wrap"
        >
          <span class="font-bold tracking-wide text-[#ddd] uppercase">{{
            label
          }}</span>
          <span class="text-[#888] font-bold">{{ val }}</span>
        </div>
        <div
          class="flex items-baseline gap-2 flex-wrap col-span-2 md:col-span-3"
        >
          <span class="font-bold tracking-wide text-[#ddd] uppercase"
            >STARTING REGION</span
          >
          <span class="text-[#888] font-bold">{{ world.startingRegion }}</span>
        </div>
      </div>
    </PanelSection>

    <PanelSection label="VACCINE STATUS" class="mb-5">
      <div class="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
        <div class="flex flex-col gap-3 whitespace-nowrap">
          <div
            v-for="[label, val] in [
              ['TOTAL NUMBER OF HOSPITALS', world.totalHospitals],
              ['NUMBER OF ACTIVE HOSPITALS', world.activeHospitals],
              ['APPROXIMATE DAYS TO COMPLETION', world.daysToCompletion],
            ]"
            :key="label"
            class="flex items-baseline gap-2 whitespace-nowrap"
            :class="
              label.includes('HOSPITALS') ? 'whitespace-nowrap' : 'flex-wrap'
            "
          >
            <span class="font-bold tracking-wide text-[#ddd] uppercase">{{
              label
            }}</span>
            <span class="text-[#888] font-bold">{{ val ?? "N/A" }}</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 items-end py-6">
          <StatBar
            v-for="[label, val] in [
              ['COMPLETION', world.vaccineCompletion],
              ['DEPLOYMENT', world.vaccineDeployment],
            ]"
            :key="label"
            :label="label as string"
            :value="val as number"
          />
        </div>
      </div>
    </PanelSection>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <PanelSection label="CLEAN REGIONS">
        <div
          class="text-center text-[13px] font-bold tracking-widest uppercase leading-relaxed text-[#888]"
        >
          <span
            v-for="r in world.cleanRegions"
            :key="r"
            class="inline-block mx-1 text-white"
            >{{ r }}</span
          >
        </div>
      </PanelSection>
      <PanelSection label="INFECTED REGIONS">
        <div
          class="text-center text-[13px] font-bold tracking-widest uppercase leading-relaxed text-[#888]"
        >
          <span
            v-for="r in world.infectedRegions"
            :key="r"
            class="inline-block mx-1 text-white"
            >{{ r }}</span
          >
        </div>
      </PanelSection>
      <PanelSection label="FORSAKEN REGIONS">
        <div
          class="text-center text-[13px] font-bold tracking-widest uppercase leading-relaxed text-[#888]"
        >
          <span
            v-for="r in world.forsakenRegions"
            :key="r"
            class="inline-block mx-1 text-white"
            >{{ r }}</span
          >
        </div>
      </PanelSection>
    </div>
  </PanelShell>
</template>
