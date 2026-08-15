import { iconProps, type IconProps } from './types'

export function ChevronRightIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}