<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div class="section">
    <span class="section-label">{{ label }}</span>
    <slot />
  </div>
</template>

<style scoped>
.section {
  position: relative;
  border: 3px solid rgba(48, 48, 48, 0.6);
  border-radius: 8px;
  padding: 24px 20px 20px;
}

.section-label {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translate(-50%, -20%);
  background: #373737;
  padding: 0 8px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #292929;
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
