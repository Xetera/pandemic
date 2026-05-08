<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps<{ active: "menu" | "world" | "disease" | null }>();
const emit = defineEmits<{
  "open-disease": [];
  "open-world": [];
  "open-menu": [];
  "update:active": ["menu" | "world" | "disease" | null];
}>();

function click(btn: "menu" | "world" | "disease") {
  const next = props.active === btn ? null : btn;
  emit("update:active", next);
  if (next) emit(`open-${btn}`);
}

const gameDate = ref(new Date());

let timer: ReturnType<typeof setInterval>;

onMounted(() => {
  timer = setInterval(() => {
    gameDate.value = new Date(gameDate.value.getTime() + 86400000);
  }, 1000);
});

onUnmounted(() => clearInterval(timer));

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const formattedDate = () => {
  const d = gameDate.value;
  return `${pad(d.getHours())} : ${pad(d.getDate())} ${pad(d.getMonth() + 1)} ${d.getFullYear()}`;
};
</script>

<template>
  <div class="bottom-bar">
    <div class="bar-left">
      <button
        class="bar-btn"
        :class="{ active: active === 'menu' }"
        @click="click('menu')"
        data-umami-event="bottombar-click"
        data-umami-event-button="menu"
      >
        MENU
      </button>
      <button
        class="bar-btn"
        :class="{ active: active === 'world' }"
        @click="click('world')"
        data-umami-event="bottombar-click"
        data-umami-event-button="world"
      >
        WORLD
      </button>
      <button
        class="bar-btn"
        :class="{ active: active === 'disease' }"
        @click="click('disease')"
        data-umami-event="bottombar-click"
        data-umami-event-button="disease"
      >
        DISEASE
      </button>
    </div>

    <div class="bar-date">{{ formattedDate() }}</div>
  </div>
</template>

<style scoped>
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(44px + env(safe-area-inset-bottom, 0));
  padding-bottom: env(safe-area-inset-bottom, 0);
  background: linear-gradient(
    180deg,
    #7a7a7a 0%,
    #3a3a3a 10%,
    #1a1a1a 18%,
    #111111 60%,
    #050505 100%
  );
  /*border-top: 1px solid #888;*/
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: stretch;
  z-index: 50;
  font-family: "Source Sans 3", sans-serif;
  user-select: none;
}

.bar-left {
  display: flex;
  align-items: stretch;
  flex: 1;
}

@media (max-width: 768px) {
  .bar-date {
    display: none !important;
  }

  .bar-btn {
    flex: 1;
    padding: 0;
  }
}

.bar-btn {
  position: relative;
  padding: 0 32px;
  background: none;
  border: none;
  color: #ccc;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition:
    background 0.1s,
    color 0.1s;
}
.bar-btn::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 2px;
  height: 100%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}
.bar-btn:hover {
  background: linear-gradient(
    180deg,
    #8a9ba8 0%,
    #3a4a5a 10%,
    #1e2e3e 18%,
    #14222e 60%,
    #050505 100%
  );
  color: #fff;
}
.bar-btn.active {
  background: linear-gradient(
    180deg,
    #7a90a0 0%,
    #2e3e4e 10%,
    #182838 18%,
    #101e2a 60%,
    #050505 100%
  );
  color: #fff;
}

.bar-date {
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #ccc;
  white-space: nowrap;
}
</style>
