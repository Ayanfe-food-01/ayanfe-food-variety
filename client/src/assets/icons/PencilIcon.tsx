import { iconProps, type IconProps } from './types'

export function PencilIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}