import { iconProps, type IconProps } from './types'

export function ChevronDownIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}