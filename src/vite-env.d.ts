/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEU_API_BASE: string;
  readonly VITE_NEU_APP_NAME?: string;
  readonly VITE_NEU_ENV_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
