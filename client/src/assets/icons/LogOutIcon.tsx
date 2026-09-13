import { iconProps, type IconProps } from './types'

export function LogOutIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}