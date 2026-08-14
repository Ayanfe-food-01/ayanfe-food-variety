import { iconProps, type IconProps } from './types'

export function SparkIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="m12 3-1.3 5.7L5 10l5.7 1.3L12 17l1.3-5.7L19 10l-5.7-1.3L12 3ZM19 16l-.6 2.4L16 19l2.4.6L19 22l.6-2.4L22 19l-2.4-.6L19 16Z" />
    </svg>
  )
}