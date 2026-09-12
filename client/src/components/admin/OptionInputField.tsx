import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckIcon, ChevronDownIcon, CloseIcon } from '../../assets/icons'
import type { PendingWholesalePackage, ProductOptionDraft, WholesalePackageClient, WholesalePackageDraft } from '../../services/adminService'
import {
  createAdminWholesalePackage,
  deleteAdminWholesalePackage,
  listAdminWholesalePackages,
  reorderAdminWholesalePackages,
  setAdminWholesalePackageActive,
  updateAdminWholesalePackage,
} from '../../services/adminService'
import { formatPrice } from '../../utils/formatPrice'
import { lockBodyScroll } from '../../utils/browserCompatibility'
import { WholesalePackageActionsMenu } from './WholesalePackageActionsMenu'

export interface OptionRowErrors {
  label?: string
  price?: string
  stockQuantity?: string
}

interface OptionInputFieldProps {
  options: ProductOptionDraft[]
  errors?: OptionRowErrors[]
  onChange: (options: ProductOptionDraft[]) => void
  maxOptions?: number
  // The already-saved product. Undefined (or no option.id) means a new/unsaved
  // size, whose wholesale packaging can only be configured once the product has
  // been saved (packages need a persisted unit/size ID).
  productId?: string
}

const MAX_OPTIONS = 50

const inputClassName = 'w-full rounded-xl border border-line px-4 py-3 font-normal outline-none focus:border-green'
const packageInputClassName = 'w-full rounded-lg border border-line px-3 py-2 text-sm font-normal outline-none focus:border-green'

interface PackageDraft {
  name: string
  unitsPerPackage: string
  price: string
  isActive: boolean
}

interface PackageDraftErrors {
  name?: string
  unitsPerPackage?: string
  price?: string
}

const emptyPackageDraft = (): PackageDraft => ({ name: '', unitsPerPackage: '', price: '', isActive: true })

export function OptionInputField({ options, errors = [], onChange, maxOptions = MAX_OPTIONS, productId }: OptionInputFieldProps) {
  const [openOptionIndex, setOpenOptionIndex] = useState<number | null>(null)
  const openIndex = openOptionIndex !== null && openOptionIndex < options.length ? openOptionIndex : null

  // Only one wholesale packaging panel can be expanded at a time, mirroring the
  // one-open-option behavior of the size rows above.
  const [packagesOpenIndex, setPackagesOpenIndex] = useState<number | null>(null)

  const [packages, setPackages] = useState<WholesalePackageClient[]>([])
  // Loading starts true for a persisted product; the mount effect only clears
  // it from the async finally so it never sets state synchronously in an effect.
  const [packagesLoading, setPackagesLoading] = useState(Boolean(productId))
  const [packagesError, setPackagesError] = useState<string | null>(null)

  // Editor modal state: which option's packages are being edited. Packages for
  // a persisted unit/size are managed through the API; packages for a new,
  // unsaved size are held as pending drafts on the option and created once the
  // product is saved.
  const [editor, setEditor] = useState<{
    optionIndex: number
    kind: 'pending' | 'persisted'
    pkg?: { id?: string; name: string; isActive: boolean }
    pendingIndex?: number
  } | null>(null)
  const [draft, setDraft] = useState<PackageDraft>(emptyPackageDraft())
  const [draftErrors, setDraftErrors] = useState<PackageDraftErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const loadPackages = useCallback(async (targetProductId: string) => {
    setPackagesError(null)
    setPackagesLoading(true)
    const loaded = await listAdminWholesalePackages(targetProductId)
    setPackages(loaded)
    setPackagesLoading(false)
  }, [])

  useEffect(() => {
    if (!productId) return
    let current = true
    listAdminWholesalePackages(productId)
      .then((loaded) => {
        if (current) setPackages(loaded)
      })
      .catch(() => {
        if (current) setPackagesError('Wholesale packaging could not be loaded.')
      })
      .finally(() => {
        if (current) setPackagesLoading(false)
      })
    return () => {
      current = false
    }
  }, [productId])

  // Lock body scroll while the package editor modal is open.
  useEffect(() => {
    if (!editor) return
    const releaseBodyScroll = lockBodyScroll()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditor(null)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      releaseBodyScroll()
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [editor])

  const packagesByOption = useMemo(() => {
    const map = new Map<string, WholesalePackageClient[]>()
    for (const pkg of packages) {
      if (!pkg.productOptionId) continue
      const list = map.get(pkg.productOptionId) ?? []
      list.push(pkg)
      map.set(pkg.productOptionId, list)
    }
    return map
  }, [packages])

  const updateOption = (index: number, field: keyof ProductOptionDraft, value: string) => {
    onChange(options.map((option, currentIndex) => currentIndex === index ? { ...option, [field]: value } : option))
  }

  const updateOptionPackages = (index: number, nextPackages: PendingWholesalePackage[]) => {
    onChange(options.map((option, currentIndex) => currentIndex === index ? { ...option, pendingPackages: nextPackages } : option))
  }

  const openCreatePending = (optionIndex: number) => {
    setDraft(emptyPackageDraft())
    setDraftErrors({})
    setSaveError(null)
    setEditor({ optionIndex, kind: 'pending' })
  }

  const openCreatePersisted = (optionIndex: number) => {
    setDraft(emptyPackageDraft())
    setDraftErrors({})
    setSaveError(null)
    setEditor({ optionIndex, kind: 'persisted' })
  }

  const openEditPersisted = (optionIndex: number, pkg: WholesalePackageClient) => {
    setDraft({ name: pkg.name, unitsPerPackage: String(pkg.unitsPerPackage), price: pkg.price, isActive: pkg.isActive })
    setDraftErrors({})
    setSaveError(null)
    setEditor({ optionIndex, kind: 'persisted', pkg })
  }

  const openEditPending = (optionIndex: number, pendingIndex: number) => {
    const pkg = options[optionIndex]?.pendingPackages?.[pendingIndex]
    if (!pkg) return
    setDraft({ name: pkg.name, unitsPerPackage: pkg.unitsPerPackage, price: pkg.price, isActive: pkg.isActive })
    setDraftErrors({})
    setSaveError(null)
    setEditor({ optionIndex, kind: 'pending', pendingIndex, pkg: { name: pkg.name, isActive: pkg.isActive } })
  }

  const openDuplicatePending = (optionIndex: number, pendingIndex: number) => {
    const pkg = options[optionIndex]?.pendingPackages?.[pendingIndex]
    if (!pkg) return
    setDraft({ name: `${pkg.name} (copy)`, unitsPerPackage: pkg.unitsPerPackage, price: pkg.price, isActive: pkg.isActive })
    setDraftErrors({})
    setSaveError(null)
    setEditor({ optionIndex, kind: 'pending', pkg: { name: `${pkg.name} (copy)`, isActive: pkg.isActive } })
  }

  const duplicatePersisted = (optionIndex: number, pkg: WholesalePackageClient) => {
    if (!productId || !options[optionIndex]?.id) return
    setDraft({ name: `${pkg.name} (copy)`, unitsPerPackage: String(pkg.unitsPerPackage), price: pkg.price, isActive: pkg.isActive })
    setDraftErrors({})
    setSaveError(null)
    setEditor({ optionIndex, kind: 'persisted' })
  }

  const updateDraft = (field: keyof PackageDraft, value: string | boolean) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setDraftErrors((current) => ({ ...current, [field]: undefined }))
    setSaveError(null)
  }

  const validateDraft = (value: PackageDraft): PackageDraftErrors => {
    const errors: PackageDraftErrors = {}
    const name = value.name.trim()
    if (name.length < 1 || name.length > 120) errors.name = 'Use 1 to 120 characters.'
    const units = value.unitsPerPackage.trim()
    if (!/^\d+$/.test(units) || Number(units) < 1) errors.unitsPerPackage = 'Enter a whole number of 1 or more.'
    const price = value.price.trim()
    if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) errors.price = 'Enter a price greater than zero with up to 2 decimals.'
    return errors
  }

  const savePackage = async () => {
    if (!editor) return
    const nextErrors = validateDraft(draft)
    setDraftErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    const targetOption = options[editor.optionIndex]
    if (!targetOption) return

    if (editor.kind === 'pending') {
      const current = targetOption.pendingPackages ?? []
      const pkg: PendingWholesalePackage = {
        name: draft.name,
        unitsPerPackage: draft.unitsPerPackage,
        price: draft.price,
        isActive: draft.isActive,
      }
      if (editor.pendingIndex === undefined) {
        updateOptionPackages(editor.optionIndex, [...current, pkg])
      } else {
        const next = [...current]
        if (editor.pendingIndex < next.length) next[editor.pendingIndex] = pkg
        updateOptionPackages(editor.optionIndex, next)
      }
      setEditor(null)
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      const payload: WholesalePackageDraft = {
        productOptionId: targetOption.id ?? null,
        name: draft.name,
        unitsPerPackage: draft.unitsPerPackage,
        price: draft.price,
        isActive: draft.isActive,
      }
      if (editor.pkg?.id) {
        await updateAdminWholesalePackage(editor.pkg.id, payload)
      } else if (productId && targetOption.id) {
        await createAdminWholesalePackage(productId, payload)
      }
      if (productId) await loadPackages(productId)
      setEditor(null)
    } catch (caught: unknown) {
      setSaveError(caught instanceof Error ? caught.message : 'The package could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  const togglePending = (optionIndex: number, pendingIndex: number) => {
    const option = options[optionIndex]
    const list = option?.pendingPackages ?? []
    const next = [...list]
    if (!next[pendingIndex]) return
    next[pendingIndex] = { ...next[pendingIndex], isActive: !next[pendingIndex].isActive }
    updateOptionPackages(optionIndex, next)
  }

  const removePending = (optionIndex: number, pendingIndex: number) => {
    const option = options[optionIndex]
    const list = option?.pendingPackages ?? []
    const pkg = list[pendingIndex]
    if (!pkg) return
    if (!window.confirm(`Remove the "${pkg.name}" package? This cannot be undone.`)) return
    const next = [...list]
    next.splice(pendingIndex, 1)
    updateOptionPackages(optionIndex, next)
  }

  const movePending = (optionIndex: number, pendingIndex: number, direction: -1 | 1) => {
    const option = options[optionIndex]
    const list = [...(option?.pendingPackages ?? [])]
    const neighbor = pendingIndex + direction
    if (neighbor < 0 || neighbor >= list.length) return
    const swap = list[pendingIndex]
    list[pendingIndex] = list[neighbor]
    list[neighbor] = swap
    updateOptionPackages(optionIndex, list)
  }

  const toggleActive = async (pkg: WholesalePackageClient) => {
    if (!productId) return
    try {
      await setAdminWholesalePackageActive(pkg.id, !pkg.isActive)
      await loadPackages(productId)
    } catch (caught: unknown) {
      setPackagesError(caught instanceof Error ? caught.message : 'The package could not be updated.')
    }
  }

  const removePackage = async (pkg: WholesalePackageClient) => {
    if (!productId) return
    if (!window.confirm(`Remove the "${pkg.name}" package? This cannot be undone.`)) return
    try {
      await deleteAdminWholesalePackage(pkg.id)
      setPackages((current) => current.filter((candidate) => candidate.id !== pkg.id))
    } catch (caught: unknown) {
      setPackagesError(caught instanceof Error ? caught.message : 'The package could not be removed.')
    }
  }

  // Swap a package with the previous/next package that shares its unit/size.
  // The full ordered id list is then persisted back to the server.
  const movePackage = async (pkg: WholesalePackageClient, direction: -1 | 1) => {
    if (!productId) return
    const index = packages.findIndex((candidate) => candidate.id === pkg.id)
    if (index < 0) return
    let neighbor = index + direction
    while (neighbor >= 0 && neighbor < packages.length && packages[neighbor].productOptionId !== pkg.productOptionId) {
      neighbor += direction
    }
    if (neighbor < 0 || neighbor >= packages.length || packages[neighbor].productOptionId !== pkg.productOptionId) return
    const next = [...packages]
    const swap = next[index]
    next[index] = next[neighbor]
    next[neighbor] = swap
    setPackages(next)
    try {
      setPackages(await reorderAdminWholesalePackages(productId, next.map((item) => item.id)))
    } catch (caught: unknown) {
      setPackagesError(caught instanceof Error ? caught.message : 'Package order could not be updated.')
      await loadPackages(productId)
    }
  }

  const editorOptionLabel = editor ? (options[editor.optionIndex]?.label.trim() || 'this size') : ''

  return (
    <div className="rounded-2xl border border-line bg-cream/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-bold text-green-dark">Quantity / size options (optional)</p>
          <p className="mt-1 text-xs font-normal text-muted">Add sizes or quantities with their own price and stock. Each size can have its own wholesale packaging (cartons/cases) below. The product price becomes the lowest option price and total stock is the sum of all options. Stock left blank defaults to 0.</p>
        </div>
        <button className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-green-dark hover:border-green disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={options.length >= maxOptions} onClick={() => { onChange([...options, { label: '', price: '', stockQuantity: '', pendingPackages: [] }]); setOpenOptionIndex(options.length) }}>Add option</button>
      </div>
      {options.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-green/25 bg-sage/25 px-4 py-6 text-center text-xs font-normal text-muted">No options yet. Use this when a product is sold in different sizes or quantities.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {options.map((option, index) => {
            const isOpen = openIndex === index
            const packagesOpen = packagesOpenIndex === index
            const rowErrors = errors[index]
            const persistedPackages = option.id ? (packagesByOption.get(option.id) ?? []) : []
            const pendingPackages = option.pendingPackages ?? []
            const isPersisted = Boolean(productId && option.id)
            const canManagePersisted = isPersisted
            const label = option.label.trim()
            const parsedPrice = Number(option.price)
            const price = Number.isFinite(parsedPrice) && parsedPrice > 0 ? formatPrice(parsedPrice) : 'Price not set'
            const stock = option.stockQuantity.trim() === '' ? '0' : option.stockQuantity.trim()
            const packageCount = persistedPackages.length + pendingPackages.length
            const activePackageCount = persistedPackages.filter((pkg) => pkg.isActive).length + pendingPackages.filter((pkg) => pkg.isActive).length
            const summaryDetail = `${price} · ${stock} in stock${packageCount > 0 ? ` · ${activePackageCount} active wholesale package${activePackageCount === 1 ? '' : 's'}` : ''}`
            const parsedRetailPrice = Number(option.price)
            return (
              <li className="overflow-hidden rounded-xl border border-line bg-white" key={option.id ?? `option-${index}`}>
                <div className="flex flex-wrap items-center gap-2 px-4 py-3.5">
                  <button className="flex min-w-0 flex-1 items-center gap-3 text-left" type="button" aria-expanded={isOpen} onClick={() => { setOpenOptionIndex(isOpen ? null : index); setPackagesOpenIndex(null) }}>
                    <ChevronDownIcon size={16} className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-green-dark">{label || `Option ${index + 1}`}</span>
                      <span className="mt-0.5 block truncate text-xs font-normal text-muted">{summaryDetail}</span>
                    </span>
                  </button>
                  {packageCount > 0 && (
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${rowHasErrors(rowErrors) ? 'bg-orange/10 text-orange' : 'bg-sage text-green-dark'}`}>
                      {rowHasErrors(rowErrors) ? 'Fix required' : `${packageCount} package${packageCount === 1 ? '' : 's'}`}
                    </span>
                  )}
                  <button className="grid size-8 shrink-0 place-items-center rounded-full text-orange transition-colors hover:bg-orange/10 hover:text-green-dark" type="button" aria-label={`Remove option ${index + 1}`} onClick={() => onChange(options.filter((_, currentIndex) => currentIndex !== index))}><CloseIcon size={15} /></button>
                </div>
                {isOpen && (
                  <div className="border-t border-line p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="text-sm font-bold text-green-dark">Label<input className={inputClassName} aria-invalid={Boolean(rowErrors?.label)} aria-describedby={rowErrors?.label ? `option-${index}-label-error` : undefined} value={option.label} maxLength={80} onChange={(event) => updateOption(index, 'label', event.target.value)} placeholder="5 kg bag" />{rowErrors?.label && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-label-error`}>{rowErrors.label}</span>}</label>
                      <label className="text-sm font-bold text-green-dark">Retail price (NGN)<input className={inputClassName} aria-invalid={Boolean(rowErrors?.price)} aria-describedby={rowErrors?.price ? `option-${index}-price-error` : undefined} type="text" inputMode="decimal" value={option.price} onChange={(event) => updateOption(index, 'price', event.target.value)} placeholder="0.00" />{rowErrors?.price && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-price-error`}>{rowErrors.price}</span>}</label>
                      <label className="text-sm font-bold text-green-dark">Stock<input className={inputClassName} aria-invalid={Boolean(rowErrors?.stockQuantity)} aria-describedby={rowErrors?.stockQuantity ? `option-${index}-stock-error` : undefined} type="number" min="0" step="1" value={option.stockQuantity} onChange={(event) => updateOption(index, 'stockQuantity', event.target.value)} placeholder="0" />{rowErrors?.stockQuantity && <span className="mt-1 block text-xs font-normal text-orange" id={`option-${index}-stock-error`}>{rowErrors.stockQuantity}</span>}</label>
                    </div>

                    <div className="mt-4 rounded-xl border border-dashed border-green/25 bg-sage/25 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          type="button"
                          aria-expanded={packagesOpen}
                          onClick={() => setPackagesOpenIndex(packagesOpen ? null : index)}
                        >
                          <ChevronDownIcon size={15} className={`shrink-0 text-muted transition-transform ${packagesOpen ? 'rotate-180' : ''}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-green-dark">Wholesale packaging for {label || 'this size'}</span>
                            {packageCount > 0 && (
                              <span className="mt-0.5 block truncate text-xs font-normal text-muted">{packageCount} package{packageCount === 1 ? '' : 's'} · {activePackageCount} active{pendingPackages.length > 0 ? ` · ${pendingPackages.length} pending save` : ''}</span>
                            )}
                          </span>
                          {packageCount > 0 && (
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${activePackageCount > 0 ? 'bg-sage text-green-dark' : 'bg-orange/10 text-orange'}`}>
                              {activePackageCount > 0 ? `${activePackageCount} active` : 'All inactive'}
                            </span>
                          )}
                        </button>
                        <button className="shrink-0 rounded-xl bg-green px-4 py-2 text-xs font-bold text-cream transition-colors hover:bg-green-dark" type="button" onClick={() => isPersisted ? openCreatePersisted(index) : openCreatePending(index)}>Add package</button>
                      </div>
                      {packagesOpen ? (
                        <>
                          {canManagePersisted && packagesLoading ? (
                            <p className="mt-2 text-xs font-normal text-muted">Loading wholesale packaging…</p>
                          ) : packageCount === 0 ? (
                            <p className="mt-2 text-xs font-normal leading-5 text-muted">No wholesale packages yet. Add one, for example a “Carton of 20” at ₦40,000 per carton. It will be created when the product is saved.</p>
                          ) : (
                            <ul className="mt-2 space-y-2">
                              {persistedPackages.map((pkg) => {
                                const globalIndex = packages.findIndex((candidate) => candidate.id === pkg.id)
                                let canMoveUp = false
                                let canMoveDown = false
                                if (globalIndex >= 0) {
                                  let neighbor = globalIndex - 1
                                  while (neighbor >= 0 && packages[neighbor].productOptionId !== pkg.productOptionId) neighbor -= 1
                                  canMoveUp = neighbor >= 0
                                  neighbor = globalIndex + 1
                                  while (neighbor < packages.length && packages[neighbor].productOptionId !== pkg.productOptionId) neighbor += 1
                                  canMoveDown = neighbor < packages.length
                                }
                                const perUnit = pkg.unitsPerPackage >= 1 ? Number(pkg.price) / pkg.unitsPerPackage : NaN
                                const notCheaperThanRetail = Number.isFinite(perUnit) && Number.isFinite(parsedRetailPrice) && parsedRetailPrice > 0 && perUnit >= parsedRetailPrice
                                return (
                                  <li className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-white px-3 py-2.5" key={pkg.id}>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-green-dark">{pkg.name}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pkg.isActive ? 'bg-sage text-green-dark' : 'bg-orange/10 text-orange'}`}>{pkg.isActive ? 'Active' : 'Inactive'}</span>
                                      </div>
                                      <p className="mt-0.5 text-xs font-normal text-muted">{pkg.unitsPerPackage} unit{pkg.unitsPerPackage === 1 ? '' : 's'} per carton · {formatPrice(Number(pkg.price))}/carton{pkg.unitsPerPackage >= 1 ? ` · ${formatPrice(perUnit)}/unit` : ''}</p>
                                      {notCheaperThanRetail && (
                                        <p className="mt-0.5 text-[11px] font-semibold text-orange">Per-unit ({formatPrice(perUnit)}) is not under the retail price ({formatPrice(parsedRetailPrice)}).</p>
                                      )}
                                    </div>
                                    <div className="flex shrink-0 items-center">
                                      <WholesalePackageActionsMenu
                                        pkg={pkg}
                                        canMoveUp={canMoveUp}
                                        canMoveDown={canMoveDown}
                                        onMoveUp={() => movePackage(pkg, -1)}
                                        onMoveDown={() => movePackage(pkg, 1)}
                                        onEdit={() => openEditPersisted(index, pkg)}
                                        onDuplicate={() => duplicatePersisted(index, pkg)}
                                        onToggleActive={() => toggleActive(pkg)}
                                        onRemove={() => removePackage(pkg)}
                                      />
                                    </div>
                                  </li>
                                )
                              })}
                              {pendingPackages.map((pkg, pendingIndex) => {
                                const perUnit = Number(pkg.unitsPerPackage) >= 1 ? Number(pkg.price) / Number(pkg.unitsPerPackage) : NaN
                                const notCheaperThanRetail = Number.isFinite(perUnit) && Number.isFinite(parsedRetailPrice) && parsedRetailPrice > 0 && perUnit >= parsedRetailPrice
                                return (
                                  <li className="rounded-xl border border-dashed border-orange/40 bg-orange/5 px-3 py-2.5" key={`pending-${index}-${pendingIndex}`}>
                                    <div className="flex items-start gap-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm font-bold text-green-dark">{pkg.name}</p>
                                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pkg.isActive ? 'bg-sage text-green-dark' : 'bg-orange/10 text-orange'}`}>{pkg.isActive ? 'Active' : 'Inactive'}</span>
                                          <span className="rounded-full border border-dashed border-orange/50 px-2 py-0.5 text-[10px] font-bold text-orange">Not saved yet</span>
                                        </div>
                                        <p className="mt-0.5 text-xs font-normal text-muted">{pkg.unitsPerPackage} unit{pkg.unitsPerPackage === '1' ? '' : 's'} per carton · {formatPrice(Number(pkg.price))}/carton{Number(pkg.unitsPerPackage) >= 1 ? ` · ${formatPrice(perUnit)}/unit` : ''}</p>
                                        {notCheaperThanRetail && (
                                          <p className="mt-0.5 text-[11px] font-semibold text-orange">Per-unit ({formatPrice(perUnit)}) is not under the retail price ({formatPrice(parsedRetailPrice)}).</p>
                                        )}
                                      </div>
                                      <div className="flex shrink-0 items-center">
                                        <WholesalePackageActionsMenu
                                          pkg={{ name: pkg.name, isActive: pkg.isActive }}
                                          canMoveUp={pendingIndex > 0}
                                          canMoveDown={pendingIndex < pendingPackages.length - 1}
                                          onMoveUp={() => movePending(index, pendingIndex, -1)}
                                          onMoveDown={() => movePending(index, pendingIndex, 1)}
                                          onEdit={() => openEditPending(index, pendingIndex)}
                                          onDuplicate={() => openDuplicatePending(index, pendingIndex)}
                                          onToggleActive={() => togglePending(index, pendingIndex)}
                                          onRemove={() => removePending(index, pendingIndex)}
                                        />
                                      </div>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {options.length >= maxOptions && <p className="mt-3 text-xs font-normal text-orange">You can add at most {maxOptions} options.</p>}

      {packagesError && <p className="mt-3 text-xs font-normal text-orange" role="alert">{packagesError}</p>}

      {editor && (
        <div className="safe-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-green-dark/45" role="presentation" onClick={() => setEditor(null)}>
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl shadow-green-dark/20"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wholesale-package-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange">Wholesale packaging</p>
                <h2 id="wholesale-package-modal-title" className="mt-1 truncate text-lg font-bold tracking-[-0.02em] text-green-dark">{editor.pkg ? `Edit ${editor.pkg.name}` : 'Add a package'}</h2>
                <p className="mt-1 text-xs font-normal text-muted">{editorOptionLabel}</p>
              </div>
              <button className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-cream hover:text-green-dark" type="button" aria-label="Close wholesale packaging" onClick={() => setEditor(null)}><CloseIcon size={18} /></button>
            </header>

            <div className="y-scrollbar overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-3">
                <label className="text-sm font-bold text-green-dark">Package name<input className={`${inputClassName} mt-2`} aria-invalid={Boolean(draftErrors.name)} type="text" value={draft.name} maxLength={120} onChange={(event) => updateDraft('name', event.target.value)} placeholder="Carton" />{draftErrors.name && <span className="mt-1 block text-xs font-normal text-orange">{draftErrors.name}</span>}</label>
                <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
                  <label className="text-sm font-bold text-green-dark">Units per carton<input className={`${packageInputClassName} mt-2`} aria-invalid={Boolean(draftErrors.unitsPerPackage)} type="text" inputMode="numeric" value={draft.unitsPerPackage} onChange={(event) => updateDraft('unitsPerPackage', event.target.value)} placeholder="20" />{draftErrors.unitsPerPackage && <span className="mt-1 block text-xs font-normal text-orange">{draftErrors.unitsPerPackage}</span>}</label>
                  <label className="text-sm font-bold text-green-dark">Wholesale price per carton (NGN)<input className={`${packageInputClassName} mt-2`} aria-invalid={Boolean(draftErrors.price)} type="text" inputMode="decimal" value={draft.price} onChange={(event) => updateDraft('price', event.target.value)} placeholder="40000" />{draftErrors.price && <span className="mt-1 block text-xs font-normal text-orange">{draftErrors.price}</span>}</label>
                </div>
                <label className="flex items-center gap-3 text-sm font-bold text-green-dark"><input className="size-4 accent-green" type="checkbox" checked={draft.isActive} onChange={(event) => updateDraft('isActive', event.target.checked)} />Active / available for wholesale purchase</label>
              </div>
              {editor.kind === 'pending' && <p className="mt-3 rounded-xl border border-dashed border-orange/40 bg-orange/5 px-4 py-3 text-xs font-normal leading-5 text-muted">This package is held on this size and will be created automatically when the product is saved.</p>}
              {saveError && <p className="mt-3 rounded-xl border border-orange/25 bg-orange/5 px-4 py-3 text-sm font-medium text-orange" role="alert">{saveError}</p>}
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-4 sm:px-6">
              <button className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark transition-colors hover:bg-cream" type="button" onClick={() => setEditor(null)}>Cancel</button>
              <button className="rounded-xl bg-green px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={isSaving} onClick={savePackage}>
                <span className="mr-2 inline-grid size-4 place-items-center rounded-full text-cream"><CheckIcon size={12} /></span>
                {isSaving ? 'Saving…' : editor.pkg ? 'Save changes' : 'Add package'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}

function rowHasErrors(rowErrors: OptionRowErrors | undefined): boolean {
  return Boolean(rowErrors && Object.keys(rowErrors).length > 0)
}
