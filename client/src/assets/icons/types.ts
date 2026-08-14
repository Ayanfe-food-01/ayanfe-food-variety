export interface IconProps {
  size?: number
  strokeWidth?: number
  className?: string
}

export const iconProps = ({ size = 24, strokeWidth = 1.8, className }: IconProps) => ({
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