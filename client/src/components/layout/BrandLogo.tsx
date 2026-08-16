import { useStoreSettings } from '../../hooks/useStoreSettings'
import { DEFAULT_LOGO_PATH } from '../../seo/config'

interface BrandLogoProps {
  className?: string
  alt?: string
}

export function BrandLogo({ className = '', alt = 'Ayanfe Food Variety logo' }: BrandLogoProps) {
  const { settings } = useStoreSettings()
  return <img className={className} src={settings?.logoUrl || DEFAULT_LOGO_PATH} alt={alt} />
}