import { iconProps, type IconProps } from './types'

export function ShieldIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M12 21s7-3.5 7-9V5l-7-2-7 2v7c0 5.5 7 9 7 9Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}