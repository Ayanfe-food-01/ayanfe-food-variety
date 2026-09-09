import { iconProps, type IconProps } from './types'

export function SortIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth: strokeWidth ?? 2, className })}>
      <path d="m3 16l4 4l4-4m-4 4V4" />
      <path d="m14 4l-4-4l-4 4m4-4v16" />
    </svg>
  )
}