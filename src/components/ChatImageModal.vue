<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import { inject, Ref, computed, ref } from 'vue';
import { IconPhoto } from '@tabler/icons-vue'
import { INJECT_IMAGE_KEY } from '../services/useImageDropzone';

const chatImageFileInjected = inject<Ref<File | null>>(INJECT_IMAGE_KEY);
const chatImageFileName = computed(() => chatImageFileInjected?.value?.name)

const imageAsBase64 = computed(() => {
  if (!chatImageFileInjected?.value || !dialogWasOpen.value) {
    return ''
  }
  return URL.createObjectURL(chatImageFileInjected.value)
})

function fileSizeToHumanReadable(size: number) {
  if (size === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
const imageSize = computed(() => {
  if (!chatImageFileInjected?.value) {
    return ''
  }
  return fileSizeToHumanReadable(chatImageFileInjected?.value?.size)
})


const dialogElement = ref<HTMLDialogElement | null>(null)
const dialogContainerElement = ref<HTMLDivElement | null>(null)
const dialogWasOpen = ref(false)
const openDialog = () => {
  dialogElement.value?.showModal()
  dialogWasOpen.value = true
}
onClickOutside(dialogContainerElement, () => dialogElement.value?.close())
</script>

<template>
  <button v-if="chatImageFileInjected" @click="openDialog" type="button" :title="chatImageFileName" class="
        absolute
        flex
        items-center justify-center
        bottom-2 right-14
        h-10 w-10
        rounded-lg
        text-zinc-200 text-sm font-medium 
        sm:text-base
        dark:bg-teal-600"
    >
    <IconPhoto :size="20" />
  </button>
  <dialog ref="dialogElement">
    <div ref="dialogContainerElement">
      <div class="px-4 py-3 flex justify-between dark:bg-zinc-800 dark:text-zinc-200">
        <h5>{{ chatImageFileName }}</h5>
        <span>{{ imageSize }}</span>
      </div>
      <img :src="imageAsBase64" class="w-full max-h-[70dvh] object-cover" alt="Uploaded image" />
    </div>
  </dialog>
</template>

