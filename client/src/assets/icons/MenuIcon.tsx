import { iconProps, type IconProps } from './types'

export function MenuIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}