import { iconProps, type IconProps } from './types'

export function TruckIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
      <path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
  )
}