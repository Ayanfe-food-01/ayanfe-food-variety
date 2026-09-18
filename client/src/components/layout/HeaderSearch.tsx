import type { Ref } from 'react'
import { ProductSearchAutocomplete } from '../products/ProductSearchAutocomplete'
import type { Product } from '../../types/product'

interface HeaderSearchProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  onSelectProduct: (product: Product) => void
  inputRef?: Ref<HTMLInputElement>
}

export function HeaderSearch({
  value,
  onChange,
  onSearch,
  onSelectProduct,
  inputRef,
}: HeaderSearchProps) {
  return (
    <ProductSearchAutocomplete
      className="order-[3] static basis-full w-full md:order-none md:basis-auto md:w-auto"
      value={value}
      onChange={onChange}
      onSearch={onSearch}
      onSelectProduct={onSelectProduct}
      placeholder="Search products, brands and categories"
      ariaLabel="Search products"
      inputRef={inputRef}
    />
  )
}