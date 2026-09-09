import { iconProps, type IconProps } from './types'

export function SortIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <path d="m3 16 4 4 4-4" />
      <path d="M7 20V4" />
      <path d="m21 8-4-4-4 4" />
      <path d="M17 4v16" />
    </svg>
  )
}