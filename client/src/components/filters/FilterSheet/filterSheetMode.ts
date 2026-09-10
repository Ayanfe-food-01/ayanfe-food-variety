import type { RefObject } from 'react'

export type FilterSheetMode = 'sheet' | 'popover'

export interface PopoverPosition {
  top: number
  left: number
  width: number
}

export const MODAL_MAX_VIEWPORT_WIDTH = 768
export const POPOVER_MIN_WIDTH = 320
export const POPOVER_MAX_WIDTH = 400
export const VIEWPORT_MARGIN = 16
export const ANCHOR_GAP = 8

export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

export function resolveVisibleAnchor(
  refs: ReadonlyArray<RefObject<HTMLElement | null> | undefined> | undefined,
): HTMLElement | null {
  if (!refs) return null
  for (const ref of refs) {
    const element = ref?.current
    if (element && isElementVisible(element)) return element
  }
  return null
}

export function getFilterSheetMode(anchor: HTMLElement | null): FilterSheetMode {
  if (!anchor) return 'sheet'
  return window.innerWidth >= MODAL_MAX_VIEWPORT_WIDTH ? 'popover' : 'sheet'
}

export function computePopoverPosition(anchor: HTMLElement): PopoverPosition {
  const rect = anchor.getBoundingClientRect()
  const width = Math.min(
    POPOVER_MAX_WIDTH,
    Math.max(POPOVER_MIN_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2),
  )
  const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN
  const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.right - width), maxLeft)
  return { top: rect.bottom + ANCHOR_GAP, left, width }
}