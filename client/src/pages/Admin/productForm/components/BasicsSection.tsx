import type { Category } from '../../../../types/category'
import type { ProductFormInput } from '../../../../services/adminService'
import { SelectField } from '../../../../components/ui/SelectField'
import { Field, adminControlClass } from './Field'
import { SectionHeading } from './SectionHeading'
import type { FormErrors } from '../types'

interface BasicsSectionProps {
  hidden: boolean
  form: ProductFormInput
  categories: Category[]
  isCategoriesLoading: boolean
  errors: FormErrors
  fieldProps: (field: keyof FormErrors) => { 'aria-invalid': boolean; 'aria-describedby': string | undefined }
  onUpdate: <Key extends keyof ProductFormInput>(field: Key, value: ProductFormInput[Key]) => void
}

export function BasicsSection({
  hidden,
  form,
  categories,
  isCategoriesLoading,
  errors,
  fieldProps,
  onUpdate,
}: BasicsSectionProps) {
  return (
    <section aria-labelledby="product-basics-heading" className={hidden ? 'hidden md:block' : ''}>
      <SectionHeading id="product-basics-heading" title="Basic information" hint="Name, category, unit and description." />
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Product name" htmlFor="product-name-input" error={errors.name} errorId="name-error">
          <input
            id="product-name-input"
            className={adminControlClass}
            {...fieldProps('name')}
            value={form.name}
            onChange={(event) => onUpdate('name', event.target.value)}
            maxLength={180}
            required
          />
        </Field>
        <Field label="Category" htmlFor="product-category-input" error={errors.categoryId} errorId="categoryId-error">
          <SelectField
            id="product-category-input"
            className="mt-2 w-full"
            {...fieldProps('categoryId')}
            disabled={isCategoriesLoading}
            onChange={(value) => onUpdate('categoryId', value)}
            options={[
              { value: '', label: isCategoriesLoading ? 'Loading categories…' : 'Select category' },
              ...categories
                .filter((category) => category.isActive)
                .map((category) => ({ value: category.id, label: category.name })),
            ]}
            required
            value={form.categoryId}
          />
        </Field>
        <Field label="Unit / quantity" htmlFor="product-unit-input" error={errors.unit} errorId="unit-error">
          <input
            id="product-unit-input"
            className={adminControlClass}
            {...fieldProps('unit')}
            value={form.unit}
            onChange={(event) => onUpdate('unit', event.target.value)}
            maxLength={80}
            placeholder="5 kg bag"
            required
          />
        </Field>
        <Field
          className="sm:col-span-2"
          label="Description"
          htmlFor="product-description-input"
          error={errors.description}
          errorId="description-error"
          hint={`${form.description.length}/4,000 characters`}
        >
          <textarea
            id="product-description-input"
            className={`${adminControlClass} min-h-32 resize-y`}
            {...fieldProps('description')}
            value={form.description}
            onChange={(event) => onUpdate('description', event.target.value)}
            maxLength={4000}
            required
          />
        </Field>
      </div>
    </section>
  )
}