import { useDropZone } from "@vueuse/core";
import { Ref, computed, provide, ref } from "vue";
import { useChats } from "./chat";
import { useAI } from "./useAI";

export const INJECT_IMAGE_KEY = 'chatImage';

export const useImageDropzone = (dropZoneElementRef: Ref<HTMLDivElement | undefined>) => {
  const { availableModels } = useAI()
  const { activeChat } = useChats()

  const imageFile = ref<File | null>(null);
  provide(INJECT_IMAGE_KEY, imageFile);

  const activeModelSupportsClip = computed(() => {
    return !!availableModels.value.find(el => activeChat.value?.model === el.name && el.details.families.includes('clip'))
  })
  
  const onDrop = (files: File[] | null) => {
    if(!activeModelSupportsClip.value) return;
    imageFile.value = files ? files[0] : null;
  }
  const { isOverDropZone } = useDropZone(dropZoneElementRef, {
    onDrop,
    dataTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp']
  })

  return {
    dropZoneIsActive: activeModelSupportsClip && isOverDropZone
  }
};