import { iconProps, type IconProps } from './types'

export function PhoneIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M6.6 3.5 9 5.8 7.4 8.4a14.2 14.2 0 0 0 8.2 8.2l2.6-1.6 2.3 2.4-1.7 2.6c-.5.8-1.5 1.1-2.4.8C9.6 18.5 5.5 14.4 3.6 7.6c-.3-.9 0-1.9.8-2.4l2.2-1.7Z" />
    </svg>
  )
}