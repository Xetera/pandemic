<script setup lang="ts">
import { computed } from "vue";

defineProps<{ musicPlaying: boolean }>();
defineEmits<{
  close: [];
  tutorial: [];
  instructions: [];
  guide: [];
  moreGames: [];
  music: [];
  newGame: [];
}>();

const contactEmail = computed(() => {
  const parts = ["contact", "hantavirus"].join("+");
  const domain = ["xetera", "dev"].join(".");
  return `mailto:${parts}@${domain}`;
});
</script>

<template>
  <div class="menu-backdrop" @click="$emit('close')">
    <div class="menu-popup" @click.stop>
      <a
        data-umami-event="github-link-click"
        target="_blank"
        href="https://github.com/xetera"
        class="menu-item"
        @click=""
      >
        MORE BY XETERA
      </a>
      <a
        data-umami-event="email-click"
        target="_blank"
        :href="contactEmail"
        class="menu-item"
      >
        CONTACT ME
      </a>
      <button
        class="menu-item"
        :class="{ muted: !musicPlaying }"
        @click="$emit('music')"
      >
        MUSIC
      </button>
      <a
        target="_blank"
        href="https://www.addictinggames.com/strategy/pandemic-2"
        class="menu-item"
      >
        PANDEMIC 2
      </a>
      <a
        data-umami-event="attribution-click"
        data-umami-event-source="menu"
        target="_blank"
        href="https://hantavirus.one/"
        class="menu-item"
      >
        DATA SOURCE
      </a>
    </div>
  </div>
</template>

<style scoped>
.menu-backdrop {
  position: absolute;
  inset: 0;
  z-index: 59;
  pointer-events: auto;
}

.menu-popup {
  position: absolute;
  bottom: 44px;
  left: 0;
  width: 440px;
  border-top-right-radius: 9px;
  background:
    linear-gradient(180deg, #8a8a8a 0%, #3a3a3a 5%, transparent 18%),
    linear-gradient(90deg, #141414 0%, #373737 100%);
  padding: 12px 6px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
  border-right: 1px solid #444;
  display: flex;
  flex-direction: column;
  z-index: 60;
  font-family: "Source Sans 3", sans-serif;
  user-select: none;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 0 15px;
  background: none;
  border: none;
  color: #999;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: left;
  cursor: pointer;
  transition: color 0.1s;
}

.menu-item:hover {
  background: none;
  color: #fff;
}

.menu-item.muted {
  color: #555;
}

.menu-item.muted:hover {
  color: #888;
}
</style>
