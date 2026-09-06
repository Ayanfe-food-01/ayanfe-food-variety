import type { ComponentType } from 'react'
import type { IconProps } from '../../assets/icons/types'
import type { FaqItem } from './FaqAccordion'

export interface HelpCategory {
  id: string
  icon: ComponentType<IconProps>
  title: string
  intro: string
  faqs: FaqItem[]
}