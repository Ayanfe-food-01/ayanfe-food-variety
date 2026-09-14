import { createAdminWholesalePackage, isFilledProductOption, type ProductFormInput } from '../../../services/adminService'

interface SavedOption {
  id: string
  sortOrder: number
}

export async function persistPendingWholesalePackages(
  form: ProductFormInput,
  savedProductId: string,
  savedOptions: SavedOption[],
): Promise<void> {
  const ordered = [...savedOptions].sort((a, b) => a.sortOrder - b.sortOrder)
  let filledPosition = 0
  for (const option of form.options) {
    if (!isFilledProductOption(option)) continue
    const savedOption = ordered[filledPosition]
    filledPosition += 1
    const pending = option.pendingPackages ?? []
    if (option.id || pending.length === 0 || !savedOption) continue
    await Promise.all(
      pending.map((pkg) =>
        createAdminWholesalePackage(savedProductId, {
          productOptionId: savedOption.id,
          name: pkg.name,
          unitsPerPackage: pkg.unitsPerPackage,
          price: pkg.price,
          isActive: pkg.isActive,
        }),
      ),
    )
  }
}