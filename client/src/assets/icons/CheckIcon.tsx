import { iconProps, type IconProps } from './types'

export function CheckIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}