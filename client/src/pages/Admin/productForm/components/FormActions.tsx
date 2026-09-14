import { Link } from 'react-router-dom'
import { SubmitButton } from '../../../../components/ui/SubmitButton'

interface FormActionsProps {
  isEditing: boolean
  canGoBack: boolean
  isLastStep: boolean
  isSaving: boolean
  isCategoriesLoading: boolean
  progressLabel: string
  onBack: () => void
  onContinue: () => void
}

export function FormActions({
  isEditing,
  canGoBack,
  isLastStep,
  isSaving,
  isCategoriesLoading,
  progressLabel,
  onBack,
  onContinue,
}: FormActionsProps) {
  const saveLabel = isEditing ? 'Save changes' : 'Create product'

  return (
    <>
      {/* Mobile: wizard controls with Continue / Save */}
      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center md:hidden">
        <Link className="rounded-xl border border-line px-4 py-3 text-center text-sm font-bold text-green-dark transition-colors hover:border-green" to="/admin/products">
          Cancel
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="rounded-xl border border-line px-4 py-3 text-sm font-bold text-green-dark transition-colors hover:border-green disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={!canGoBack}
            onClick={onBack}
          >
            Back
          </button>
          {isLastStep ? (
            <SubmitButton className="px-4! py-3! text-sm!" busy={isSaving} busyLabel={progressLabel} disabled={isCategoriesLoading}>
              {saveLabel}
            </SubmitButton>
          ) : (
            <button
              className="rounded-xl bg-green px-4 py-3 text-sm font-bold text-cream transition-colors hover:bg-green-dark"
              type="button"
              onClick={onContinue}
            >
              Continue
            </button>
          )}
        </div>
      </div>
      {/* Desktop: all sections visible, just Save / Cancel */}
      <div className="hidden items-center justify-end gap-3 border-t border-line pt-6 md:flex">
        <Link className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-green-dark transition-colors hover:border-green" to="/admin/products">
          Cancel
        </Link>
        <SubmitButton className="px-6! py-3! text-sm!" busy={isSaving} busyLabel={progressLabel} disabled={isCategoriesLoading}>
          {saveLabel}
        </SubmitButton>
      </div>
    </>
  )
}