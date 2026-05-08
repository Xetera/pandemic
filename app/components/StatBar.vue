<script setup lang="ts">
defineProps<{ label: string; value: number }>();
</script>

<template>
  <div>
    <div class="label">{{ label }}</div>
    <div class="track">
      <div class="fill" :style="{ width: value * 100 + '%' }" />
    </div>
  </div>
</template>

<style scoped>
.label {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #aaa;
  text-align: center;
  margin-bottom: 10px;
}

.track {
  height: 18px;
  background: linear-gradient(
    180deg,
    rgb(75 120 148) 0%,
    rgb(45 78 104) 8%,
    rgb(35 65 89) 50%,
    rgb(22 45 63) 100%
  );
  border-radius: 10px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: linear-gradient(
    180deg,
    rgb(90 160 230) 0%,
    rgb(50 110 175) 8%,
    rgb(31 86 147) 50%,
    rgb(18 55 100) 100%
  );
  transition: width 0.3s;
}
</style>
