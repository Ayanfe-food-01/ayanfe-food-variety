import { iconProps, type IconProps } from './types'

export function ArrowRight({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}