/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
