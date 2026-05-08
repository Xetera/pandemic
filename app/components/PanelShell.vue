<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; wide?: boolean }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <div
    class="fixed inset-0 flex items-start sm:items-center justify-center z-[100] py-4 sm:pt-0"
    @click.self="$emit('close')"
  >
    <div
      class="panel relative rounded-md max-w-[95vw] max-h-[calc(100dvh-var(--bottom-bar-height)-20px)] overflow-y-auto px-4 pt-8 pb-10 font-sans text-[#ccc]"
      :class="wide ? 'w-[1100px]' : 'w-[900px] md:px-14'"
    >
      <button
        class="w-9 h-9 absolute top-3 font-black right-4 bg-transparent border-[#303030] border-3 text-[#232323] text-sm px-2 py-0.5 rounded-lg cursor-pointer hover:bg-[#424242]"
        @click="$emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="1" y1="1" x2="13" y2="13" />
          <line x1="13" y1="1" x2="1" y2="13" />
        </svg>
      </button>

      <div class="text-center mb-5">
        <h1
          class="text-3xl font-bold text-[#c8c8c8] tracking-widest uppercase m-0"
        >
          {{ title }}
        </h1>
        <h2
          v-if="subtitle"
          class="text-sm text-[#999] tracking-widest uppercase mt-1 mb-0 font-bold"
        >
          {{ subtitle }}
        </h2>
      </div>

      <slot />
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: linear-gradient(
    180deg,
    #5a5a5a 0%,
    #434343 1%,
    #373737 4%,
    #373737 100%
  );
  container-type: inline-size;
  container-name: panel;
}
</style>
