interface IconProps {
  size?: number
  strokeWidth?: number
  className?: string
}

const iconProps = ({ size = 24, strokeWidth = 1.8, className }: IconProps) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className,
})

export function ArrowUpRight({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  )
}

export function ArrowRight({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function CartIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <circle cx="9" cy="20" r="1.25" />
      <circle cx="19" cy="20" r="1.25" />
      <path d="M3 4h2l2.2 10.3a2 2 0 0 0 2 1.7h8.1a2 2 0 0 0 1.9-1.4L21 8H7" />
    </svg>
  )
}

export function UserIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.6-3.3 2.8-5 6.5-5s5.9 1.7 6.5 5" />
    </svg>
  )
}

export function MenuIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function MoreHorizontalIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <circle cx="5" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SearchIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function ChevronDownIcon({ size, strokeWidth, className }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth, className })}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function EyeIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

export function EyeOffIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="m3 3 18 18" />
      <path d="M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a16.7 16.7 0 0 1-3.2 3.7M6.2 6.9C3.9 8.5 2.5 12 2.5 12S6 18 12 18c1.4 0 2.7-.3 3.8-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

export function MoonIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M20 15.2A8 8 0 0 1 8.8 4 8.2 8.2 0 1 0 20 15.2Z" />
    </svg>
  )
}

export function BellIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
    </svg>
  )
}

export function GlobeIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 9h16.4M3.8 15h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.1-3.3-8.5S9.8 5.8 12 3.5Z" />
    </svg>
  )
}

export function CloseIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function CheckIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export function TruckIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
      <path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
  )
}

export function HeartIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M20.8 8.6c0 5.4-8.8 10.2-8.8 10.2S3.2 14 3.2 8.6A4.5 4.5 0 0 1 12 6.2a4.5 4.5 0 0 1 8.8 2.4Z" />
    </svg>
  )
}

export function ShieldIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M12 21s7-3.5 7-9V5l-7-2-7 2v7c0 5.5 7 9 7 9Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function SparkIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="m12 3-1.3 5.7L5 10l5.7 1.3L12 17l1.3-5.7L19 10l-5.7-1.3L12 3ZM19 16l-.6 2.4L16 19l2.4.6L19 22l.6-2.4L22 19l-2.4-.6L19 16Z" />
    </svg>
  )
}

export function PhoneIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <path d="M6.6 3.5 9 5.8 7.4 8.4a14.2 14.2 0 0 0 8.2 8.2l2.6-1.6 2.3 2.4-1.7 2.6c-.5.8-1.5 1.1-2.4.8C9.6 18.5 5.5 14.4 3.6 7.6c-.3-.9 0-1.9.8-2.4l2.2-1.7Z" />
    </svg>
  )
}

export function MailIcon({ size, strokeWidth }: IconProps) {
  return (
    <svg {...iconProps({ size, strokeWidth })}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}