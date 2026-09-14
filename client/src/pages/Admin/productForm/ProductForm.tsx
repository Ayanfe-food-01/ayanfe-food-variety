import { Breadcrumb } from '../../../components/ui/Breadcrumb'
import { useProductForm } from './useProductForm'
import { BasicsSection } from './components/BasicsSection'
import { ImagesSection } from './components/ImagesSection'
import { PricingSection } from './components/PricingSection'
import { ReviewSection } from './components/ReviewSection'
import { FormErrorBanner } from './components/FormErrorBanner'
import { MobileProgress } from './components/MobileProgress'
import { FormActions } from './components/FormActions'
import { ProductFormSkeleton } from './components/ProductFormSkeleton'

const cardClass = 'rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8'

export function ProductForm() {
  const c = useProductForm()

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Products', href: '/admin/products' },
              { label: c.isEditing ? 'Edit product' : 'Add product' },
            ]}
          />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-orange">Catalog</p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">
            {c.isEditing ? 'Edit product' : 'Add product'}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {c.isEditing ? 'Update the product details and inventory level.' : 'Add a product customers can discover and purchase.'}
          </p>
        </div>
      </div>

      <div className="mt-8">
        {c.isLoading ? (
          <ProductFormSkeleton isEditing={c.isEditing} />
        ) : (
          <form id="product-form" className="space-y-5 lg:grid lg:grid-cols-[3fr_2fr] lg:gap-5 lg:space-y-0" noValidate onSubmit={c.submit}>
            <div className="lg:col-span-2">
              <FormErrorBanner message={c.error} />
            </div>
            <div className="lg:col-span-2">
              <MobileProgress step={c.step} onSelect={c.goToStep} />
            </div>

            <div className={cardClass}>
              <BasicsSection
                hidden={c.step !== 0}
                form={c.form}
                categories={c.categories}
                isCategoriesLoading={c.isCategoriesLoading}
                errors={c.fieldErrors}
                fieldProps={c.fieldProps}
                onUpdate={c.update}
              />
            </div>

            <div className={cardClass}>
              <ImagesSection
                hidden={c.step !== 1}
                productName={c.form.name}
                imageDrafts={c.imageDrafts}
                error={c.fieldErrors.image}
                onChoose={c.chooseImages}
                onRemove={c.removeImage}
                onMove={c.moveImage}
              />
            </div>

            <div className={cardClass}>
              <PricingSection
                hidden={c.step !== 2}
                form={c.form}
                productId={c.productId}
                hasFilledOptions={c.hasFilledOptions}
                derivedPrice={c.derivedPrice}
                derivedStock={c.derivedStock}
                errors={c.fieldErrors}
                optionErrors={c.optionErrors}
                archivedOptions={c.archivedOptions}
                fieldProps={c.fieldProps}
                onUpdate={c.update}
                onUpdateDiscountType={c.updateDiscountType}
                onOptionsChange={c.updateOptions}
                onRestoreArchived={c.restoreArchivedOption}
              />
            </div>

            <div className={cardClass}>
              <ReviewSection
                hidden={c.step !== 3}
                productName={c.form.name}
                unit={c.form.unit}
                selectedCategory={c.selectedCategory}
                displayPrice={c.displayPrice}
                displayStock={c.displayStock}
                displayDiscount={c.displayDiscount}
                imageCount={c.imageDrafts.length}
                filledOptionsCount={c.filledOptions.length}
                hasFilledOptions={c.hasFilledOptions}
                isActive={c.form.isActive}
                isFeatured={c.form.isFeatured}
                isSaving={c.isSaving}
                onIsActiveChange={(checked) => c.update('isActive', checked)}
                onFeaturedChange={(checked) => c.update('isFeatured', checked)}
              />
            </div>

            <div className="lg:col-span-2">
              <FormActions
                isEditing={c.isEditing}
                canGoBack={c.canGoBack}
                isLastStep={c.isLastStep}
                isSaving={c.isSaving}
                isCategoriesLoading={c.isCategoriesLoading}
                progressLabel={c.progressLabel}
                onBack={c.back}
                onContinue={c.next}
              />
            </div>
          </form>
        )}
      </div>
    </>
  )
}