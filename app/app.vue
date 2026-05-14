<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  attachZoom,
  makeInitialTransform,
  identityTransform,
  type Transform,
} from "~/utils/zoom";
import type { Region } from "~/utils/airports";
import {
  regionForCountry,
  REGION_POPULATION,
  type RegionKey,
} from "~/utils/countryRegions";

interface CountryReport {
  iso: string;
  country: string;
  confirmed: string;
  suspected: string;
  deaths: string;
  status: string;
}

interface RegionStat {
  infected: number;
  dead: number;
  countries: {
    name: string;
    iso: string;
    confirmed: number;
    suspected: number;
    deaths: number;
    status: string;
  }[];
}

type TimelineEntry = {
  date: string;
  time_utc: string;
  date_display: string;
  headline: string;
  url: string;
  source: string;
};

const { data: countriesData } = await useAsyncData("countries", () =>
  $fetch<CountryReport[]>("/api/countries").catch(() => [] as CountryReport[]),
);

const { data: timelineData } = await useAsyncData("timeline", () =>
  $fetch<TimelineEntry[]>("/api/timeline").catch(() => [] as TimelineEntry[]),
);

const regions = ref<Record<string, Region>>({});

if (import.meta.client) {
  fetch("/regions.json")
    .then((r) => r.json())
    .then((d) => {
      regions.value = d;
    });
}

const regionStats = computed<Partial<Record<RegionKey, RegionStat>>>(() => {
  const countries = countriesData.value ?? [];
  const stats: Partial<Record<RegionKey, RegionStat>> = {};
  for (const c of countries) {
    const key = regionForCountry(c.iso);
    if (!key) continue;
    const confirmed = parseInt(c.confirmed, 10) || 0;
    const suspected = parseInt(c.suspected, 10) || 0;
    const deaths = parseInt(c.deaths, 10) || 0;
    const bucket = (stats[key] ??= { infected: 0, dead: 0, countries: [] });
    bucket.infected += confirmed;
    bucket.dead += deaths;
    bucket.countries.push({
      name: c.country,
      iso: c.iso,
      confirmed,
      suspected,
      deaths,
      status: c.status ?? "",
    });
  }
  return stats;
});

const news = computed(() =>
  [...(timelineData.value ?? [])]
    .sort((a, b) => (b.date + b.time_utc).localeCompare(a.date + a.time_utc))

    .map((e) => ({
      date: e.date_display,
      text: e.headline,
      url: e.url,
      source: e.source,
    })),
);

const hovered = ref<string | null>(null);
const MAP_W = 4000;
const MAP_H = 2780;
const MAP_TOP = 600;

const enabledAirports = computed<Set<string>>(() => {
  const set = new Set<string>();
  for (const [key, region] of Object.entries(regions.value)) {
    for (const f of region.facilities) {
      if (f.type === "airport") {
        set.add(`${key}:${f.global_x},${f.global_y}`);
      }
    }
  }
  return set;
});

const isMobile = ref(false);
const viewportW = ref(0);
const viewportH = ref(0);

const svgEl = ref<SVGSVGElement | null>(null);
const transform = ref<Transform>(identityTransform);
const ready = ref(false);
const dragging = ref(false);
let zoomController: ReturnType<typeof attachZoom> | null = null;

const MAX_SCALE = 5;

onMounted(() => {
  isMobile.value = window.innerWidth <= 768;
  viewportW.value = window.innerWidth;
  viewportH.value = window.innerHeight;
  window.addEventListener("resize", () => {
    isMobile.value = window.innerWidth <= 768;
    viewportW.value = window.innerWidth;
    viewportH.value = window.innerHeight;
  });

  const el = svgEl.value!;
  const { width, height } = el.getBoundingClientRect();
  const { fitScale, t: initialTransform } = makeInitialTransform(
    width,
    height,
    MAP_W,
    MAP_H,
    MAP_TOP,
  );

  zoomController = attachZoom(el, initialTransform, {
    scaleExtent: [fitScale, MAX_SCALE],
    translateExtent: [
      [0, MAP_TOP],
      [MAP_W, MAP_H],
    ],
    onStart: () => {
      startMusic();
      dragging.value = true;
    },
    onZoom: (t) => {
      transform.value = t;
    },
    onEnd: () => {
      dragging.value = false;
    },
  });

  transform.value = initialTransform;
  ready.value = true;
});

const introDialog = ref<HTMLDivElement | null>(null);
const showIntro = ref(true);

function dismissIntro() {
  const el = introDialog.value;
  if (!el) return;
  el.classList.add("closing");
  el.addEventListener(
    "animationend",
    () => {
      showIntro.value = false;
      startMusic();
    },
    { once: true },
  );
}

const showDisease = ref(false);
const showWorld = ref(false);
const activePanel = ref<"menu" | "world" | "disease" | null>(null);
const selectedRegion = ref<{
  name: string;
  afflictions: { label: string; active: boolean }[];
  governmentAffairs: { label: string; active: boolean }[];
  services: { label: string; active: boolean }[];
  population: {
    healthy: number;
    infected: number;
    suspected: number;
    dead: number;
    alive: number;
  };
} | null>(null);

function govLabel(label: string, on: boolean): string {
  switch (label) {
    case "MASK MANDATE":
      return on ? "MASK MANDATE IN EFFECT" : "NO MASK MANDATE";
    case "VACCINE ROLLOUT":
      return on ? "VACCINES BEING ADMINISTERED" : "VACCINES NOT DEPLOYED";
    case "CONTACT TRACING":
      return on ? "CONTACT TRACING ACTIVE" : "NO CONTACT TRACING";
    case "SOCIAL DISTANCING":
      return on
        ? "SOCIAL DISTANCING ENFORCED"
        : "SOCIAL DISTANCING NOT IN EFFECT";
    case "QUARANTINE ENFORCEMENT":
      return on ? "QUARANTINE ENFORCED" : "QUARANTINE NOT ENFORCED";
    case "TRAVEL RESTRICTIONS":
      return on ? "TRAVEL RESTRICTED" : "BORDERS WIDE OPEN";
    default:
      return on ? label : `NO ${label}`;
  }
}

function openRegion(key: string) {
  if (dragging.value) return;
  const region = regions.value[key];
  if (!region) return;
  window.umami?.track("region-click", { region: region.full_name });
  const afflictionLabels = [
    "RIOTS",
    "FLOODS",
    "DROUGHTS",
    "HURRICANES",
    "EARTHQUAKES",
  ];
  const govLabels = [
    "MASK MANDATE",
    "VACCINE ROLLOUT",
    "CONTACT TRACING",
    "SOCIAL DISTANCING",
    "QUARANTINE ENFORCEMENT",
    "TRAVEL RESTRICTIONS",
  ];
  const serviceLabels = [
    "AIRPORTS",
    "SHIPYARDS",
    "HOSPITALS",
    "BORDERS",
    "TRANSIT",
    "SCHOOLS",
  ];
  const stat = regionStats.value[key as RegionKey];
  const infected = stat?.infected ?? 0;
  const suspected = stat?.countries.reduce((s, c) => s + c.suspected, 0) ?? 0;
  const dead = stat?.dead ?? 0;
  const totalPop = REGION_POPULATION[key as RegionKey] ?? 0;
  const alive = Math.max(0, totalPop - dead);
  const healthy = Math.max(0, alive - infected);
  selectedRegion.value = {
    name: region.full_name,
    afflictions: afflictionLabels.map((label) => {
      return {
        label: `${label} ARE NOT IN EFFECT`,
        active: false,
      };
    }),
    governmentAffairs: govLabels.map((label) => {
      return { label: govLabel(label, false), active: false };
    }),
    services: serviceLabels.map((label) => {
      const verb = label === "TRANSIT" ? "IS" : "ARE";
      return {
        label: `${label} ${verb} OPEN`,
        active: true,
      };
    }),
    population: {
      healthy,
      infected,
      suspected,
      dead,
      alive,
    },
    countries: stat?.countries ?? [],
  };
}

const DISEASE_START = new Date("2026-04-06");

const world = computed(() => {
  let infectedPopulation = 0;
  let deadPopulation = 0;
  let alivePopulation = 0;
  const cleanRegions: string[] = [];
  const infectedRegions: string[] = [];

  for (const [key, region] of Object.entries(regions.value)) {
    const stat = regionStats.value[key as RegionKey];
    const totalPop = REGION_POPULATION[key as RegionKey] ?? 0;
    const infected = stat?.infected ?? 0;
    const dead = stat?.dead ?? 0;
    const alive = Math.max(0, totalPop - dead);

    infectedPopulation += infected;
    deadPopulation += dead;
    alivePopulation += alive;

    if (infected > 0) infectedRegions.push(region.full_name);
    else cleanRegions.push(region.full_name);
  }

  return {
    alivePopulation,
    deadPopulation,
    healthyPopulation: Math.max(0, alivePopulation - infectedPopulation),
    infectedPopulation,
    diseaseStart: DISEASE_START,
    startingRegion: "Argentina",
    totalHospitals: 24,
    activeHospitals: 24,
    daysToCompletion: "n/a",
    vaccineCompletion: 0,
    vaccineDeployment: 0,
    cleanRegions,
    infectedRegions,
    forsakenRegions: [] as string[],
  };
});

const disease = computed(() => {
  const daysSinceStart = Math.max(
    1,
    Math.floor((Date.now() - DISEASE_START.getTime()) / 86_400_000),
  );
  const totalInfected = world.value.infectedPopulation;
  const totalDead = world.value.deadPopulation;
  return {
    name: "ANDES HANTAVIRUS",
    type: "VIRUS EVOLUTION",
    evolutionPoints: 0,
    avgInfectionsPerDay: totalInfected / daysSinceStart,
    avgDeathsPerDay: totalDead / daysSinceStart,
    lethality: 0.45,
    infectivity: 0.32,
    visibility: 0.55,
    symptoms: [
      {
        name: "SNEEZING",
        active: false,
        tooltip:
          "Andes primarily attacks the lungs, not the upper respiratory tract. Nasal symptoms are rare and sneezing plays no real role in how it spreads.",
      },
      {
        name: "COUGHING",
        active: true,
        tooltip:
          "As the lungs fill with fluid, patients cough up infected secretions. Close caregivers, family members and medical staff alike, are especially vulnerable.",
      },
      {
        name: "FEVER",
        active: true,
        tooltip:
          "Fever is one of the first signs the body is fighting back. It kicks in early during the prodromal phase and often tips off health workers that something serious is happening.",
      },
      {
        name: "SWEATING",
        active: true,
        tooltip:
          "Heavy sweating comes with the fever and can leave infected fluid on skin and surfaces. In close quarters, that raises the risk of contact transmission.",
      },
      {
        name: "VOMITING",
        active: true,
        tooltip:
          "Gastrointestinal symptoms show up in roughly half of cases. The vomiting itself spreads viral particles and takes a real toll on caregivers managing infected patients.",
      },
      {
        name: "FATIGUE",
        active: true,
        tooltip:
          "Exhaustion hits early and hard, often before anyone suspects hantavirus. Patients feel too worn down to seek care, which extends the window where they're infectious without knowing it.",
      },
      {
        name: "DIARRHEA",
        active: false,
        tooltip:
          "Andes doesn't cause significant gut involvement. Diarrhea hasn't shown up consistently in clinical cases and isn't part of the typical picture.",
      },
      {
        name: "NAUSEA",
        active: true,
        tooltip:
          "Early presentation resembles influenza: nausea, general malaise, mild fever. The nonspecific nature of these symptoms makes early identification difficult.",
      },
      {
        name: "PULMONARY EDEMA",
        active: true,
        tooltip:
          "Fluid flooding the lungs is what kills most Andes patients. It can progress from mild respiratory distress to full respiratory failure within hours.",
      },
      {
        name: "MYALGIA",
        active: true,
        tooltip:
          "Severe muscle aches are one of the most prominent early signs, appearing alongside fever and headache days before the lungs are affected. Patients often describe it as the worst body pain they've felt.",
      },
      {
        name: "HYPERSENSITIVITY",
        active: false,
        tooltip:
          "Andes does dysregulate the immune system, but it doesn't produce the kind of full-blown hypersensitivity or cytokine storm seen in some other hemorrhagic fevers.",
      },
      {
        name: "ATAXIA",
        active: false,
        tooltip:
          "Andes doesn't target the nervous system. Motor problems and coordination issues aren't part of the clinical picture.",
      },
      {
        name: "KIDNEY FAILURE",
        active: false,
        tooltip:
          "Kidney damage is the hallmark of Old World hantaviruses like Hantaan. Andes goes after the lungs instead, renal failure is not commonly observed.",
      },
      {
        name: "DEPRESSION",
        active: false,
        tooltip:
          "Survivors sometimes deal with psychological effects afterward, but acute depression isn't part of how Andes presents during active infection.",
      },
      {
        name: "HEMORRHAGING",
        active: true,
        tooltip:
          "Unlike most hantaviruses, Andes can cause bleeding: petechiae, mucosal hemorrhage, vascular leakage. It's one of the features that makes it particularly dangerous.",
      },
      {
        name: "LIVER FAILURE",
        active: false,
        tooltip:
          "Liver complications are sometimes observed, though a progressing viral infection doesn't often get to the stage of liver failure before other complications.",
      },
      {
        name: "HEART FAILURE",
        active: true,
        tooltip:
          "The leading cause of death in Andes HPS. Capillary leak floods the lungs and starves the heart of oxygen, causing hemodynamic collapse often within a day or two of cardiopulmonary onset.",
      },
      {
        name: "BLINDNESS",
        active: false,
        tooltip:
          "Visual symptoms aren't associated with Andes. The virus doesn't affect the eyes and blindness hasn't appeared in any known case series.",
      },
      {
        name: "HYPOTONIA",
        active: false,
        tooltip:
          "Muscle tone problems aren't part of Andes hantavirus. The virus causes severe illness, but not this kind.",
      },
      {
        name: "ENCEPHALITIS",
        active: false,
        tooltip:
          "Andes doesn't inflame the brain. The damage stays in the lungs and cardiovascular system, which sets it apart from some other viral hemorrhagic fevers.",
      },
    ],
    resistances: [
      {
        name: "COLD I",
        active: true,
        tooltip:
          "The long-tailed pygmy rice rat, Andes' primary host, thrives in the cool, humid Andean foothills. The virus has adapted to persist in those same temperate conditions.",
      },
      {
        name: "COLD II",
        active: false,
        tooltip:
          "Below-freezing temperatures break down the viral envelope quickly outside a host. The virus has no meaningful tolerance for sustained cold at that range.",
      },
      {
        name: "HEAT I",
        active: false,
        tooltip:
          "Andes is a cool-climate virus. It breaks down faster in warm conditions and hasn't shown meaningful adaptation to heat.",
      },
      {
        name: "MOISTURE I",
        active: true,
        tooltip:
          "Humid conditions help the virus persist longer in rodent excreta. Infected droppings can stay viable for days in moist, shaded spots.",
      },
      {
        name: "MOISTURE II",
        active: false,
        tooltip:
          "Andes doesn't love wet conditions so much as it tolerates them. The virus hangs around longer in damp environments, but that's more about slowing breakdown than any real affinity for moisture.",
      },
      {
        name: "DRUG I",
        active: false,
        tooltip:
          "There's no approved antiviral for Andes. Ribavirin has been tried but hasn't shown statistically conclusive benefits.",
      },
    ],
    transmissions: [
      {
        name: "RODENT",
        active: true,
        tooltip:
          "The long-tailed pygmy rice rat (Oligoryzomys longicaudatus) carries the virus without getting sick. Humans pick it up through contact with the rodent's urine, droppings, or saliva.",
      },
      {
        name: "HUMAN",
        active: true,
        tooltip:
          "Andes is the only hantavirus that has shown significant person-to-person spread. It happens through close contact, especially within households, and it's what makes outbreak containment so difficult.",
      },
      {
        name: "WATERBORNE",
        active: false,
        tooltip:
          "Hantavirus doesn't survive well in open water and breaks down with standard treatment. Waterborne spread isn't a route for Andes.",
      },
      {
        name: "AIRBORNE",
        active: true,
        tooltip:
          "The main way people get infected is by breathing in aerosolized particles from rodent excreta in enclosed spaces. Person-to-person airborne transmission has also been confirmed among close contacts.",
      },
    ],
    traits: [
      {
        name: "DURABLE",
        active: true,
        tooltip:
          "Dried rodent droppings can stay infectious for days or even weeks under cool, dry conditions. People can be exposed long after the rodent is gone.",
      },
      {
        name: "VIRUS",
        active: true,
        tooltip:
          "Andes is a negative-sense single-stranded RNA virus in the Hantaviridae family. Its segmented genome makes it prone to mutation and gives it room to evade immune responses.",
      },
      {
        name: "HEMORRHAGIC",
        active: true,
        tooltip:
          "Unlike North American hantaviruses, Andes can produce significant hemorrhagic features. Vascular leakage and coagulopathy cause both internal and mucosal bleeding.",
      },
    ],
  };
});

const facilityPaths: Record<string, { black: string; white: string }> = {
  "59.svg": {
    black:
      "M7.25 -4.05 L8.1 -4.9 8.2 -5.05 8.2 -5.0 12.3 -9.1 12.35 -9.25 Q12.85 -10.6 11.85 -11.85 10.6 -12.85 9.25 -12.35 L9.15 -12.3 5.05 -8.2 4.95 -8.1 4.1 -7.25 Q3.5 -6.7 -1.3 -8.15 L-6.75 -9.5 -8.85 -8.6 -8.9 -8.55 -10.7 -7.75 -10.9 -7.5 Q-11.05 -7.25 -10.65 -6.85 L-7.85 -5.15 -6.05 -4.15 Q-5.85 -4.0 -2.35 -2.0 L-2.2 -1.95 -2.05 -1.85 -2.05 -1.8 -1.95 -1.65 -1.75 -1.4 -6.8 3.6 -8.1 3.1 -9.95 2.65 -10.15 2.7 -10.15 2.75 -10.25 2.7 -12.5 4.95 Q-12.0 5.1 -11.55 5.45 L-10.65 5.8 -7.3 7.35 -5.8 10.7 -5.4 11.6 -4.9 12.5 -2.7 10.3 -2.75 10.15 -2.7 10.15 -2.6 9.95 -3.1 8.15 -3.6 6.8 1.45 1.75 1.65 2.0 1.7 1.95 1.8 2.1 1.85 2.05 1.95 2.2 2.05 2.35 4.15 6.05 5.15 7.85 6.85 10.7 Q7.2 11.05 7.5 10.9 L7.75 10.7 8.6 8.95 8.6 8.85 9.5 6.8 8.2 1.3 Q6.7 -3.5 7.25 -4.05 M10.0 -20.0 Q20.0 -20.0 20.0 -10.0 L20.0 10.0 Q20.0 20.0 10.0 20.0 L-10.0 20.0 Q-20.0 20.0 -20.0 10.0 L-20.0 -10.0 Q-20.0 -20.0 -10.0 -20.0 L10.0 -20.0",
    white:
      "M7.25 -4.05 Q6.7 -3.5 8.2 1.3 L9.5 6.8 8.6 8.85 8.6 8.95 7.75 10.7 7.5 10.9 Q7.2 11.05 6.85 10.7 L5.15 7.85 4.15 6.05 2.05 2.35 1.95 2.2 1.85 2.05 1.8 2.1 1.7 1.95 1.65 2.0 1.45 1.75 -3.6 6.8 -3.1 8.15 -2.6 9.95 -2.7 10.15 -2.75 10.15 -2.7 10.3 -4.9 12.5 -5.4 11.6 -5.8 10.7 -7.3 7.35 -10.65 5.8 -11.55 5.45 Q-12.0 5.1 -12.5 4.95 L-10.25 2.7 -10.15 2.75 -10.15 2.7 -9.95 2.65 -8.1 3.1 -6.8 3.6 -1.75 -1.4 -1.95 -1.65 -2.05 -1.8 -2.05 -1.85 -2.2 -1.95 -2.35 -2.0 Q-5.85 -4.0 -6.05 -4.15 L-7.85 -5.15 -10.65 -6.85 Q-11.05 -7.25 -10.9 -7.5 L-10.7 -7.75 -8.9 -8.55 -8.85 -8.6 -6.75 -9.5 -1.3 -8.15 Q3.5 -6.7 4.1 -7.25 L4.95 -8.1 5.05 -8.2 9.15 -12.3 9.25 -12.35 Q10.6 -12.85 11.85 -11.85 12.85 -10.6 12.35 -9.25 L12.3 -9.1 8.2 -5.0 8.2 -5.05 8.1 -4.9 7.25 -4.05",
  },
  "62.svg": {
    black:
      "M3.9 -11.35 Q3.9 -13.15 2.1 -13.15 L-2.05 -13.15 Q-3.85 -13.15 -3.85 -11.35 L-3.85 -3.85 -11.35 -3.85 Q-13.15 -3.85 -13.15 -2.05 L-13.15 2.1 Q-13.15 3.9 -11.35 3.9 L-3.85 3.9 -3.85 11.35 Q-3.85 13.15 -2.05 13.15 L2.1 13.15 Q3.9 13.15 3.9 11.35 L3.9 3.9 11.35 3.9 Q13.15 3.9 13.15 2.1 L13.15 -2.05 Q13.15 -3.85 11.35 -3.85 L3.9 -3.85 3.9 -11.35 M10.0 -20.0 Q20.0 -20.0 20.0 -10.0 L20.0 10.0 Q20.0 20.0 10.0 20.0 L-10.0 20.0 Q-20.0 20.0 -20.0 10.0 L-20.0 -10.0 Q-20.0 -20.0 -10.0 -20.0 L10.0 -20.0",
    white:
      "M3.9 -11.35 L3.9 -3.85 11.35 -3.85 Q13.15 -3.85 13.15 -2.05 L13.15 2.1 Q13.15 3.9 11.35 3.9 L3.9 3.9 3.9 11.35 Q3.9 13.15 2.1 13.15 L-2.05 13.15 Q-3.85 13.15 -3.85 11.35 L-3.85 3.9 -11.35 3.9 Q-13.15 3.9 -13.15 2.1 L-13.15 -2.05 Q-13.15 -3.85 -11.35 -3.85 L-3.85 -3.85 -3.85 -11.35 Q-3.85 -13.15 -2.05 -13.15 L2.1 -13.15 Q3.9 -13.15 3.9 -11.35",
  },
  "65.svg": {
    black:
      "M0.6 -14.7 L-0.2 -14.85 -0.6 -14.75 Q-0.95 -14.8 -1.55 -14.4 -3.0 -13.5 -3.0 -12.0 L-2.75 -10.65 Q-2.3 -9.45 -1.25 -9.3 L-1.45 -6.65 -4.65 -6.75 -8.65 -6.5 -8.7 -6.4 -8.7 -6.3 Q-9.3 -6.2 -9.3 -5.4 L-9.2 -4.95 -8.85 -4.7 -8.7 -4.7 -8.65 -4.7 -8.45 -4.7 -8.35 -4.7 -8.25 -4.7 -2.2 -4.75 -1.7 -4.75 -1.45 -4.75 -1.5 -4.0 -1.4 -3.3 -1.6 -1.95 -1.65 3.15 -1.55 8.3 -1.9 8.6 -1.9 8.8 Q-2.8 9.45 -4.55 9.45 -6.5 9.45 -8.45 7.2 L-9.45 6.2 -8.75 4.9 -12.3 1.7 Q-12.65 1.65 -12.7 2.1 L-12.9 2.3 Q-13.65 3.25 -13.65 4.2 -13.65 5.9 -12.75 7.1 -12.05 8.15 -9.65 9.95 L-7.4 11.25 -4.95 12.2 -2.5 12.7 Q-2.1 12.8 -1.5 13.2 L-1.0 14.1 -0.35 14.7 -0.3 14.7 -0.15 14.7 -0.05 14.7 0.0 14.7 0.2 14.6 0.65 14.1 1.15 13.2 2.15 12.7 4.6 12.2 7.05 11.25 9.3 9.95 12.4 7.1 Q13.3 5.9 13.3 4.2 13.3 3.25 12.55 2.3 L12.35 2.1 Q12.3 1.65 11.95 1.7 L8.4 4.9 9.1 6.2 8.1 7.2 Q6.15 9.45 4.2 9.45 2.45 9.45 1.55 8.8 L1.55 8.6 1.4 8.5 1.3 1.25 1.2 -4.75 1.35 -4.75 1.85 -4.75 7.9 -4.7 8.0 -4.7 8.1 -4.7 8.3 -4.7 8.5 -4.7 8.85 -4.95 8.9 -5.2 9.2 -5.4 9.2 -5.7 8.85 -5.9 8.35 -6.3 8.35 -6.4 8.3 -6.5 4.3 -6.75 1.1 -6.65 1.05 -7.4 0.9 -9.3 Q1.95 -9.45 2.4 -10.65 L2.65 -12.0 Q2.65 -13.5 1.2 -14.4 L0.6 -14.7 M0.15 -10.4 L0.1 -10.3 -0.15 -10.25 -0.35 -10.25 -0.35 -10.3 -0.45 -10.3 -0.5 -10.4 -0.6 -10.4 -1.0 -10.6 -1.1 -10.7 Q-1.55 -11.2 -1.55 -11.8 -1.55 -12.45 -1.1 -12.9 L-0.35 -13.3 -0.35 -13.35 -0.2 -13.35 Q0.35 -13.3 0.75 -12.9 L1.2 -11.8 0.75 -10.7 0.65 -10.6 0.25 -10.4 0.15 -10.4 M10.0 -20.0 Q20.0 -20.0 20.0 -10.0 L20.0 10.0 Q20.0 20.0 10.0 20.0 L-10.0 20.0 Q-20.0 20.0 -20.0 10.0 L-20.0 -10.0 Q-20.0 -20.0 -10.0 -20.0 L10.0 -20.0",
    white:
      "M0.6 -14.7 L1.2 -14.4 Q2.65 -13.5 2.65 -12.0 L2.4 -10.65 Q1.95 -9.45 0.9 -9.3 L1.05 -7.4 1.1 -6.65 4.3 -6.75 8.3 -6.5 8.35 -6.4 8.35 -6.3 8.85 -5.9 9.2 -5.7 9.2 -5.4 8.9 -5.2 8.85 -4.95 8.5 -4.7 8.3 -4.7 8.1 -4.7 8.0 -4.7 7.9 -4.7 1.85 -4.75 1.35 -4.75 1.2 -4.75 1.3 1.25 1.4 8.5 1.55 8.6 1.55 8.8 Q2.45 9.45 4.2 9.45 6.15 9.45 8.1 7.2 L9.1 6.2 8.4 4.9 11.95 1.7 Q12.3 1.65 12.35 2.1 L12.55 2.3 Q13.3 3.25 13.3 4.2 13.3 5.9 12.4 7.1 L9.3 9.95 7.05 11.25 4.6 12.2 2.15 12.7 1.15 13.2 0.65 14.1 0.2 14.6 0.0 14.7 -0.05 14.7 -0.15 14.7 -0.3 14.7 -0.35 14.7 -1.0 14.1 -1.5 13.2 Q-2.1 12.8 -2.5 12.7 L-4.95 12.2 -7.4 11.25 -9.65 9.95 Q-12.05 8.15 -12.75 7.1 -13.65 5.9 -13.65 4.2 -13.65 3.25 -12.9 2.3 L-12.7 2.1 Q-12.65 1.65 -12.3 1.7 L-8.75 4.9 -9.45 6.2 -8.45 7.2 Q-6.5 9.45 -4.55 9.45 -2.8 9.45 -1.9 8.8 L-1.9 8.6 -1.55 8.3 -1.65 3.15 -1.6 -1.95 -1.4 -3.3 -1.5 -4.0 -1.45 -4.75 -1.7 -4.75 -2.2 -4.75 -8.25 -4.7 -8.35 -4.7 -8.45 -4.7 -8.65 -4.7 -8.7 -4.7 -8.85 -4.7 -9.2 -4.95 -9.3 -5.4 Q-9.3 -6.2 -8.7 -6.3 L-8.7 -6.4 -8.65 -6.5 -4.65 -6.75 -1.45 -6.65 -1.25 -9.3 Q-2.3 -9.45 -2.75 -10.65 L-3.0 -12.0 Q-3.0 -13.5 -1.55 -14.4 -0.95 -14.8 -0.6 -14.75 L-0.2 -14.85 0.6 -14.7 M0.15 -10.4 L0.25 -10.4 0.65 -10.6 0.75 -10.7 1.2 -11.8 0.75 -12.9 Q0.35 -13.3 -0.2 -13.35 L-0.35 -13.35 -0.35 -13.3 -1.1 -12.9 Q-1.55 -12.45 -1.55 -11.8 -1.55 -11.2 -1.1 -10.7 L-1.0 -10.6 -0.6 -10.4 -0.5 -10.4 -0.45 -10.3 -0.35 -10.3 -0.35 -10.25 -0.15 -10.25 0.1 -10.3 0.15 -10.4",
  },
  "68.svg": {
    black:
      "M10.0 -20.0 Q20.0 -20.0 20.0 -10.0 L20.0 10.0 Q20.0 20.0 10.0 20.0 L-10.0 20.0 Q-20.0 20.0 -20.0 10.0 L-20.0 -10.0 Q-20.0 -20.0 -10.0 -20.0 L10.0 -20.0 M0.0 -14.0 L0.0 -13.85 -0.05 -14.0 -0.05 -13.75 Q-2.3 -1.85 -4.05 1.45 L-4.85 2.6 Q-6.7 4.55 -6.65 7.2 -6.7 10.0 -4.7 12.0 -2.75 13.9 -0.05 13.95 L0.0 13.95 Q2.7 13.9 4.65 12.0 6.65 10.0 6.65 7.2 6.65 4.8 5.2 3.0 L4.15 1.75 Q2.35 -1.3 0.0 -13.75 L0.0 -14.0",
    white:
      "M0.0 -14.0 L0.0 -13.75 Q2.35 -1.3 4.15 1.75 L5.2 3.0 Q6.65 4.8 6.65 7.2 6.65 10.0 4.65 12.0 2.7 13.9 0.0 13.95 L-0.05 13.95 Q-2.75 13.9 -4.7 12.0 -6.7 10.0 -6.65 7.2 -6.7 4.55 -4.85 2.6 L-4.05 1.45 Q-2.3 -1.85 -0.05 -13.75 L-0.05 -14.0 0.0 -13.85 0.0 -14.0",
  },
};

const audio = import.meta.client
  ? Object.assign(new Audio("/music.opus"), { loop: true, volume: 0.4 })
  : null;
const musicPlaying = ref(false);
let musicStarted = false;
let userPaused = false;

function startMusic() {
  if (musicStarted || userPaused) return;
  musicStarted = true;
  musicPlaying.value = true;
  audio?.play();
}

function toggleMusic() {
  if (!audio) return;
  if (musicPlaying.value) {
    audio.pause();
    musicPlaying.value = false;
    userPaused = true;
  } else {
    audio.play();
    musicPlaying.value = true;
    userPaused = false;
  }
}

function onPanTo({ x, y }: { x: number; y: number }) {
  zoomController?.translateTo(x, y);
}
</script>

<template>
  <div class="map-wrap" :class="{ dragging }">
    <div class="pan-layer">
      <svg ref="svgEl" class="overlay">
        <defs>
          <radialGradient
            id="ocean"
            :cx="MAP_W / 2"
            :cy="MAP_TOP + (MAP_H - MAP_TOP) / 3"
            :r="MAP_W * 0.9"
            :fx="MAP_W / 2"
            :fy="MAP_TOP + (MAP_H - MAP_TOP) / 3"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stop-color="#4db8ff" />
            <stop offset="100%" stop-color="#036eff" />
          </radialGradient>
        </defs>
        <g v-show="ready" :transform="transform.toString()">
          <rect
            :x="-MAP_W"
            :y="-MAP_H"
            :width="MAP_W * 3"
            :height="MAP_H * 3"
            fill="url(#ocean)"
          />
          <g
            v-for="(region, key) in regions"
            :key="key"
            :transform="`translate(${region.registration_x}, ${region.registration_y})`"
            @mouseenter="!isMobile && (hovered = String(key))"
            @mouseleave="!isMobile && (hovered = null)"
            @click="openRegion(String(key))"
            class="region"
          >
            <path
              :d="region.shape_d"
              :class="{
                highlight: hovered === key,
                infected: (regionStats[key as RegionKey]?.infected ?? 0) > 0,
              }"
              class="region-shape"
            />
            <g
              v-for="(f, i) in region.facilities"
              :key="i"
              :transform="`translate(${f.global_x - region.registration_x}, ${f.global_y - region.registration_y})`"
            >
              <g v-if="facilityPaths[f.svg_active]">
                <path
                  :d="facilityPaths[f.svg_active].black"
                  fill="#000"
                  fill-rule="evenodd"
                />
                <path
                  :d="facilityPaths[f.svg_active].white"
                  fill="#fff"
                  fill-rule="evenodd"
                />
              </g>
            </g>
          </g>
          <image
            href="/borders.svg"
            x="326.1"
            y="799.95"
            width="2886.65"
            height="1445.15"
            style="pointer-events: none"
            fetchpriority="high"
          />
          <ShipOverlay />
          <PlaneOverlay
            :regions="regions"
            :enabled-airports="enabledAirports"
          />
        </g>
      </svg>
    </div>

    <div class="vignette" />

    <div class="map-gizmos">
      <button class="gizmo-btn">
        <svg
          width="20"
          height="34"
          viewBox="0 0 16 26.8"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="matrix(1,0,0,1,8,20.2)">
            <path
              d="M2.85 -9.5 L-2.7 -9.5 -7.0 -19.2 7.0 -19.2 2.85 -9.5 M7.0 5.6 L-7.0 5.6 -2.7 -4.1 2.8 -4.15 7.0 5.6"
              fill="#990000"
              fill-opacity="0.102"
              fill-rule="evenodd"
            />
            <path
              d="M2.85 -9.5 L-2.7 -9.5 -7.0 -19.2 7.0 -19.2 2.85 -9.5 M7.0 5.6 L-7.0 5.6 -2.7 -4.1 2.8 -4.15 7.0 5.6 Z"
              fill="none"
              stroke="#000"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-opacity="0.2"
              stroke-width="2"
            />
          </g>
        </svg>
      </button>
      <button class="gizmo-btn">
        <svg
          width="23"
          height="34"
          viewBox="0 0 18 26.95"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="matrix(1,0,0,1,9,20.25)">
            <path
              d="M2.7 -2.3 L8.0 -2.3 0.0 5.7 -8.0 -2.3 -2.7 -2.3 -2.7 -18.3 0.0 -19.25 2.7 -18.3 2.7 -2.3"
              fill="#990000"
              fill-opacity="0.102"
              fill-rule="evenodd"
            />
            <path
              d="M2.7 -2.3 L8.0 -2.3 0.0 5.7 -8.0 -2.3 -2.7 -2.3 -2.7 -18.3 0.0 -19.25 2.7 -18.3 2.7 -2.3 Z"
              fill="none"
              stroke="#000"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-opacity="0.2"
              stroke-width="2"
            />
          </g>
        </svg>
      </button>
      <button class="gizmo-btn">
        <svg
          width="30"
          height="30"
          viewBox="0 0 24.3 24.25"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="matrix(1,0,0,1,12.15,18.95)">
            <path
              d="M7.8 -6.85 Q7.8 -10.1 5.55 -12.35 L5.5 -12.4 Q3.25 -14.65 0.0 -14.65 L-0.05 -14.65 Q-3.25 -14.65 -5.55 -12.4 L-5.55 -12.35 Q-7.8 -10.1 -7.8 -6.85 -7.8 -3.6 -5.55 -1.35 -3.25 0.95 -0.05 0.95 L0.0 0.95 Q3.25 0.95 5.5 -1.35 7.8 -3.6 7.8 -6.85 L11.15 -6.85 M7.85 -14.7 L5.55 -12.35 M5.5 -1.35 L7.85 1.0 M-0.05 -17.95 L-0.05 -14.65 M-7.9 -14.7 L-5.55 -12.35 M-7.8 -6.85 L-11.15 -6.85 M-0.05 0.95 L-0.05 4.3 M-7.9 1.0 L-5.55 -1.35"
              fill="none"
              stroke="#000"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-opacity="0.2"
              stroke-width="2"
            />
            <path
              d="M7.8 -6.85 Q7.8 -3.6 5.5 -1.35 3.25 0.95 0.0 0.95 L-0.05 0.95 Q-3.25 0.95 -5.55 -1.35 -7.8 -3.6 -7.8 -6.85 -7.8 -10.1 -5.55 -12.35 L-5.55 -12.4 Q-3.25 -14.65 -0.05 -14.65 L0.0 -14.65 Q3.25 -14.65 5.5 -12.4 L5.55 -12.35 Q7.8 -10.1 7.8 -6.85"
              fill="#990000"
              fill-opacity="0.102"
              fill-rule="evenodd"
            />
          </g>
        </svg>
      </button>
    </div>

    <Sidebar
      :transform="transform"
      :map-width="MAP_W"
      :map-height="MAP_H"
      :map-top="MAP_TOP"
      :viewport-width="viewportW"
      :viewport-height="viewportH"
      :news="news"
      @pan-to="onPanTo"
    />

    <BottomBar
      v-model:active="activePanel"
      @open-disease="showDisease = true"
      @open-world="showWorld = true"
    />

    <MenuPopup
      v-if="activePanel === 'menu'"
      :music-playing="musicPlaying"
      @close="activePanel = null"
      @music="toggleMusic"
    />

    <DiseasePanel
      v-if="showDisease"
      :disease="disease"
      @close="
        showDisease = false;
        activePanel = null;
      "
    />

    <WorldPanel
      v-if="showWorld"
      :world="world"
      @close="
        showWorld = false;
        activePanel = null;
      "
    />

    <RegionPanel
      v-if="selectedRegion"
      :region="selectedRegion"
      @close="selectedRegion = null"
    />

    <div
      v-if="showIntro"
      class="intro-overlay fixed inset-0 z-[1000] flex items-center justify-center bg-black/65 backdrop-blur-sm"
      @click.self="dismissIntro"
    >
      <div
        ref="introDialog"
        class="intro-dialog w-full max-w-[520px] sm:w-[90vw] max-h-[calc(100dvh-var(--bottom-bar-height)-20px)] overflow-y-auto flex flex-col items-center gap-5 sm:rounded-2xl border-y sm:border border-white/10 bg-[#0e1117] px-10 py-12 text-center shadow-2xl ring-1 ring-white/5"
      >
        <div class="flex flex-col items-center gap-1">
          <p
            class="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-red-400/70"
          >
            Live Outbreak Tracker
          </p>
          <h1 class="text-4xl sm:text-5xl font-black tracking-tight text-white">
            HANTAVIRUS
          </h1>
        </div>

        <p class="text-base sm:text-sm leading-relaxed text-white/50">
          A real-time outbreak tracker styled after the classic flash game
          <span class="inline-flex items-center align-middle">
            <picture class="-mr-[3px] h-[22px]">
              <source srcset="/pandemic.webp" type="image/webp" />
              <img src="/pandemic.png" alt="Pandemic" class="h-[22px] w-auto" />
            </picture>
            <picture class="h-[22px]">
              <source srcset="/two.webp" type="image/webp" />
              <img src="/two.png" alt="2" class="h-[22px] w-auto" />
            </picture>
          </span>
          that inspired many other popular games like Plague Inc.
        </p>

        <a
          class="text-sm sm:text-xs text-red-300/60 underline underline-offset-2 hover:text-red-300"
          href="https://www.addictinggames.com/strategy/pandemic-2"
          target="_blank"
          >Play Pandemic 2 here if you haven't already.</a
        >

        <button
          autofocus
          class="mt-2 cursor-pointer rounded border border-white/10 bg-white/5 px-8 py-2.5 text-sm sm:text-xs font-bold uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/10 hover:text-white"
          @click="dismissIntro"
        >
          Continue
        </button>
        <i class="text-xs text-white/30"
          >You can turn off the music under menu</i
        >
      </div>
    </div>
  </div>
</template>

<style>
:root {
  --bottom-bar-height: calc(44px + env(safe-area-inset-bottom, 0px));
}

body {
  background: #000;
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes dialog-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
}

.intro-overlay {
  animation: dialog-in 0.18s ease-out both;
}

.intro-dialog {
  animation: dialog-in 0.18s ease-out both;
}

.intro-dialog.closing {
  animation: dialog-out 0.15s ease-in both;
}

.map-wrap {
  position: relative;
  width: 100vw;
  max-width: 1920px;
  margin: 0 auto;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: none;
}
.map-wrap.dragging {
  cursor: grabbing;
}

.vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  background:
    linear-gradient(
      to right,
      rgba(0, 0, 0, 0.55) 0%,
      transparent 4%,
      transparent 96%,
      rgba(0, 0, 0, 0.55) 100%
    ),
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.55) 0%,
      transparent 4%,
      transparent 96%,
      rgba(0, 0, 0, 0.55) 100%
    );
}

.pan-layer {
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.region {
  cursor: pointer;
}

.region-shape {
  fill: #1f6600;
  fill-opacity: 1;
  stroke: none;
  transition: fill-opacity 0.15s;
}
.region-shape.highlight {
  fill: #2a8800;
}
.region-shape.infected {
  fill: #4a6600;
}
.region-shape.infected.highlight {
  fill: #5a8800;
}

.tooltip {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 6px 14px;
  border-radius: 4px;
  font-family: sans-serif;
  font-size: 14px;
  pointer-events: none;
  letter-spacing: 0.05em;
}

.map-gizmos {
  position: absolute;
  top: 24px;
  right: 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 40px;
  z-index: 20;
}

.gizmo-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.1s;
}

.gizmo-btn:hover {
  opacity: 1;
}

.gizmo-btn img {
  display: block;
}
</style>
