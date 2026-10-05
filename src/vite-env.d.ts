/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Default Ollama URL baked in at build time. "/" means same origin (Docker/nginx proxy). */
  readonly VITE_OLLAMA_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
