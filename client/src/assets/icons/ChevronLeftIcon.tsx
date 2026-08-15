import { iconProps, type IconProps } from './types'

export function ChevronLeftIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}