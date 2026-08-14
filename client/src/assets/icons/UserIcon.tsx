import { iconProps, type IconProps } from './types'

export function UserIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.6-3.3 2.8-5 6.5-5s5.9 1.7 6.5 5" />
    </svg>
  )
}