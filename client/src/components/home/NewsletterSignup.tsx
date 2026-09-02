import { useState } from 'react'
import { RevealOnScroll } from '../ui/RevealOnScroll'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!EMAIL_PATTERN.test(email.trim())) {
      setStatus('error')
      return
    }
    setStatus('success')
  }

  return (
    <RevealOnScroll>
      <section className="bg-sage/30 py-20 lg:py-24" aria-labelledby="newsletter-heading">
        <div className="mx-auto w-[calc(100%-32px)] max-w-[1160px] md:w-[calc(100%-48px)]">
          <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center shadow-sm sm:px-10">
            <div className="mb-5 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
              <span className="inline-block size-2 rounded-full bg-orange" /> Stay in the loop
            </div>
            <h2 id="newsletter-heading" className="m-0 text-4xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-5xl">Recipes, restocks &amp; offers — first in your inbox.</h2>
            <p className="mx-auto mt-5 max-w-[480px] text-base leading-7 text-muted">Join our newsletter for seasonal specials, new arrivals and easy weeknight inspiration. No spam — just good food.</p>

            {status === 'success' ? (
              <div className="mx-auto mt-8 max-w-[460px] rounded-2xl border border-green/20 bg-sage/40 px-6 py-5 text-sm font-bold text-green-dark" role="status">
                You&rsquo;re on the list. Welcome to the Ayanfe family!
              </div>
            ) : (
              <form className="mx-auto mt-8 flex max-w-[480px] flex-col gap-3 sm:flex-row" onSubmit={handleSubmit} noValidate>
                <label className="sr-only" htmlFor="newsletter-email">Email address</label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  aria-invalid={status === 'error'}
                  aria-describedby={status === 'error' ? 'newsletter-error' : undefined}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (status === 'error') setStatus('idle')
                  }}
                  className="w-full flex-1 rounded-full border border-line bg-cream px-6 py-3.5 text-sm font-bold text-green-dark placeholder:text-green-dark/40 focus:border-orange focus:outline-none"
                />
                <button type="submit" className="rounded-full bg-orange px-7 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105">
                  Subscribe
                </button>
              </form>
            )}
            {status === 'error' && (
              <p id="newsletter-error" className="mt-3 text-sm font-bold text-orange" role="alert">Please enter a valid email address.</p>
            )}
          </div>
        </div>
      </section>
    </RevealOnScroll>
  )
}
