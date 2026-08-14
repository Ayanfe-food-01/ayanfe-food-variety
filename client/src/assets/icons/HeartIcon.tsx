import { iconProps, type IconProps } from './types'

export function HeartIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <path d="M20.8 8.6c0 5.4-8.8 10.2-8.8 10.2S3.2 14 3.2 8.6A4.5 4.5 0 0 1 12 6.2a4.5 4.5 0 0 1 8.8 2.4Z" />
    </svg>
  )
}