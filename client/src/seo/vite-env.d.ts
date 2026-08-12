interface ImportMetaEnv {
  readonly PUBLIC_APP_URL?: string
  readonly VITE_API_URL?: string
  readonly VITE_DEV_API_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}