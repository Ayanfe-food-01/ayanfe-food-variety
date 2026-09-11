import { iconProps, type IconProps } from './types'

export function BuildingIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <path d="M3 21h18" />
      <path d="m12 3.5 9.5 6.5V11H2.5v-1L12 3.5Z" />
      <path d="M5.5 11v10" />
      <path d="M9.8 11v10" />
      <path d="M14.2 11v10" />
      <path d="M18.5 11v10" />
    </svg>
  )
}