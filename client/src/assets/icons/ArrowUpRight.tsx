import { iconProps, type IconProps } from './types'

export function ArrowUpRight({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  )
}