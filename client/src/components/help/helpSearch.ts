import type { ReactNode } from 'react'
import type { FaqItem } from './FaqAccordion'

export interface SearchableCategory {
  id: string
  title: string
  faqs: FaqItem[]
}

export interface SearchResult<TCategory extends SearchableCategory> {
  tokens: string[]
  categories: TCategory[] | null
  total: number
}

export const nodeToText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join(' ')
  if (typeof node === 'object' && 'props' in node) {
    const children = (node as { props: { children?: ReactNode } }).props?.children
    return nodeToText(children)
  }
  return ''
}

export const searchTokens = (value: string): string[] =>
  value.toLocaleLowerCase('en').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)

interface SearchIndexCategory {
  id: string
  title: string
  faqs: { question: string; searchText: string }[]
}

const buildSearchIndex = (categories: SearchableCategory[]): SearchIndexCategory[] =>
  categories.map((category) => ({
    id: category.id,
    title: category.title,
    faqs: category.faqs.map((faq) => ({
      question: faq.question,
      searchText: `${faq.question} ${nodeToText(faq.answer)} ${category.title}`.toLocaleLowerCase('en'),
    })),
  }))

interface SearchHit {
  categoryId: string
  faq: FaqItem
  score: number
}

export const searchHelpFaqs = <TCategory extends SearchableCategory>(
  categories: TCategory[],
  query: string,
): SearchResult<TCategory> => {
  const tokens = searchTokens(query)
  if (tokens.length === 0) return { tokens, categories: null, total: 0 }

  const index = buildSearchIndex(categories)
  const hits: SearchHit[] = []
  categories.forEach((category, categoryIndex) => {
    const indexCategory = index[categoryIndex]
    category.faqs.forEach((faq, faqIndex) => {
      const searchText = indexCategory?.faqs[faqIndex]?.searchText ?? ''
      const score = tokens.reduce((total, token) => (searchText.includes(token) ? total + 1 : total), 0)
      if (score > 0) hits.push({ categoryId: category.id, faq, score })
    })
  })

  hits.sort((a, b) => b.score - a.score)

  const resultCategories = categories
    .map((category) => ({
      ...category,
      faqs: hits.filter((hit) => hit.categoryId === category.id).map((hit) => hit.faq),
    }))
    .filter((category) => category.faqs.length > 0)

  return { tokens, categories: resultCategories.length > 0 ? resultCategories : null, total: hits.length }
}