import { iconProps, type IconProps } from './types'

export function CartIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <circle cx="9" cy="20" r="1.25" />
      <circle cx="19" cy="20" r="1.25" />
      <path d="M3 4h2l2.2 10.3a2 2 0 0 0 2 1.7h8.1a2 2 0 0 0 1.9-1.4L21 8H7" />
    </svg>
  )
}