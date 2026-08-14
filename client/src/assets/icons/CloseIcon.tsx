import { iconProps, type IconProps } from './types'

export function CloseIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}