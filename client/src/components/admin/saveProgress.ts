export type AdminSaveMode = 'create' | 'update'

export const getSaveProgressLabel = (
  mode: AdminSaveMode,
): string => {
  return mode === 'create' ? 'Creating…' : 'Updating…'
}