<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ edit: []; delete: [] }>()

const REVEAL = 76
const offset = ref(0)
const dragging = ref(false)
const startX = ref(0)
const startOffset = ref(0)

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  startX.value = e.clientX
  startOffset.value = offset.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - startX.value
  let next = startOffset.value + dx
  next = Math.min(REVEAL + 24, Math.max(next, -(REVEAL + 24)))
  offset.value = next
}

function onPointerUp() {
  dragging.value = false
  if (offset.value <= -REVEAL / 2) offset.value = -REVEAL
  else if (offset.value >= REVEAL / 2) offset.value = REVEAL
  else offset.value = 0
}

function close() {
  offset.value = 0
}
defineExpose({ close })

function handleEdit() {
  emit('edit')
  close()
}

function handleDelete() {
  emit('delete')
  close()
}
</script>

<template>
  <div class="relative overflow-hidden">
    <div class="absolute inset-y-0 left-0 flex" :style="{ width: REVEAL + 'px' }">
      <button
        type="button"
        class="flex-1 flex items-center justify-center text-xs font-medium"
        style="background: var(--accent); color: var(--ink)"
        @click="handleEdit"
      >
        Edit
      </button>
    </div>
    <div class="absolute inset-y-0 right-0 flex" :style="{ width: REVEAL + 'px' }">
      <button
        type="button"
        class="flex-1 flex items-center justify-center text-xs font-medium"
        style="background: var(--money-out); color: var(--ink)"
        @click="handleDelete"
      >
        Delete
      </button>
    </div>
    <div
      class="relative"
      :class="dragging ? 'select-none' : ''"
      :style="{
        transform: `translateX(${offset}px)`,
        transition: dragging ? 'none' : 'transform 150ms ease',
        background: 'var(--ink)',
        touchAction: 'pan-y',
      }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <slot />
    </div>
  </div>
</template>
