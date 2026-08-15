export type AdminSaveEntity = 'product' | 'category' | 'banner'
export type AdminSaveMode = 'create' | 'update'

const entityLabels: Record<AdminSaveEntity, string> = {
  product: 'product',
  category: 'category',
  banner: 'banner',
}

export const getSaveProgressLabel = (
  entity: AdminSaveEntity,
  mode: AdminSaveMode,
  hasImage: boolean,
): string => {
  const action = mode === 'create' ? 'Creating' : 'Updating'
  const entityLabel = entityLabels[entity]
  return hasImage
    ? `Uploading image and ${action.toLowerCase()} ${entityLabel}…`
    : `${action} ${entityLabel}…`
}