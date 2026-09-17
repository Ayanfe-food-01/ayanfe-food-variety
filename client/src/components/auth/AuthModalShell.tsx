import { useRef, type PointerEvent, type ReactNode, type RefObject } from 'react'
import { CloseIcon } from '../../assets/icons'

interface AuthModalShellProps {
  children: ReactNode
  label: string
  onClose: () => void
  panelRef: RefObject<HTMLDivElement | null>
  closeButtonRef: RefObject<HTMLButtonElement | null>
}

export function AuthModalShell({ children, label, onClose, panelRef, closeButtonRef }: AuthModalShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sheetDragRef = useRef({ startY: 0, pulled: 0, active: false })

  const handleSheetPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const scroll = scrollRef.current
    if (!scroll || !panelRef.current) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    sheetDragRef.current = { startY: event.clientY, pulled: 0, active: true }
    panelRef.current.style.animation = 'none'
  }

  const handleSheetPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const scroll = scrollRef.current
    const panel = panelRef.current
    if (!scroll || !panel || !sheetDragRef.current.active) return
    const dy = Math.max(0, event.clientY - sheetDragRef.current.startY)
    if (scroll.scrollTop > 0) {
      const startScrollTop = scroll.scrollTop
      if (dy < startScrollTop) {
        scroll.scrollTop = startScrollTop - dy
        return
      }
      scroll.scrollTop = 0
      sheetDragRef.current.pulled = dy - startScrollTop
    } else {
      sheetDragRef.current.pulled = dy
    }
    panel.style.transition = 'none'
    panel.style.transform = `translateY(${sheetDragRef.current.pulled}px)`
  }

  const handleSheetPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current
    const { active, pulled } = sheetDragRef.current
    if (!active || !panel) return
    sheetDragRef.current.active = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const threshold = Math.max(120, panel.getBoundingClientRect().height * 0.25)
    if (pulled > threshold) {
      onClose()
      return
    }
    panel.style.transition = 'transform .28s cubic-bezier(0.22, 1, 0.36, 1)'
    panel.style.transform = ''
    window.setTimeout(() => {
      panel.style.transition = ''
    }, 300)
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] grid items-end justify-items-center p-0 sm:place-items-center sm:pt-[max(1rem,env(safe-area-inset-top))] sm:pr-[max(1rem,env(safe-area-inset-right))] sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:pl-[max(1rem,env(safe-area-inset-left))]">
      <div
        className="fixed inset-0 cursor-pointer pointer-events-auto bg-[#142116]/45 animate-auth-fade motion-reduce:animate-none"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="pointer-events-auto relative flex w-full max-h-[calc(100dvh-env(safe-area-inset-top)-56px)] animate-auth-sheet motion-reduce:animate-none flex-col overflow-hidden rounded-t-3xl border border-line bg-card shadow-[0_24px_64px_rgb(20_33_22/28%)] sm:w-[min(440px,100%)] sm:max-h-full sm:animate-auth-up sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <button
          ref={closeButtonRef}
          className="absolute right-3.5 top-3.5 z-[2] grid size-[34px] cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted transition-[background-color,color] duration-[180ms] hover:bg-sage hover:text-green-dark"
          type="button"
          onClick={onClose}
          aria-label="Close sign in"
        >
          <CloseIcon size={20} />
        </button>
        <div
          className="flex h-6 shrink-0 touch-none items-start justify-center pt-2.5 sm:hidden"
          role="presentation"
          onPointerDown={handleSheetPointerDown}
          onPointerMove={handleSheetPointerMove}
          onPointerUp={handleSheetPointerUp}
          onPointerCancel={handleSheetPointerUp}
        >
          <span className="h-[5px] w-12 rounded-full bg-sage" aria-hidden="true" />
        </div>
        <div className="y-scrollbar overflow-y-auto pt-0 [-webkit-overflow-scrolling:touch] sm:pt-[50px]" ref={scrollRef}>
          {children}
        </div>
      </div>
    </div>
  )
}