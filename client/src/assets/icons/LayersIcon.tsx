import { iconProps, type IconProps } from './types'

export function LayersIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <path d="m12 2 10 5-10 5L2 7l10-5Z" />
      <path d="m2 12 10 5 10-5" />
      <path d="m2 17 10 5 10-5" />
    </svg>
  )
}