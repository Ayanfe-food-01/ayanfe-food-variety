import { useMemo, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, HelpIcon } from '../assets/icons'
import { helpCategories, quickLinks } from '../components/help/content'
import { HelpCategoryGrid } from '../components/help/HelpCategoryGrid'
import { searchHelpFaqs } from '../components/help/helpSearch'
import { StillNeedHelpSection } from '../components/help/StillNeedHelpSection'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { SearchBar } from '../components/ui/SearchBar'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { getBreadcrumbSchema, HELP_DESCRIPTION, HELP_TITLE } from '../seo/config'
import { Seo } from '../seo/Seo'

export function Help() {
  const { settings } = useStoreSettings()
  const phone = settings?.businessPhone?.trim()
  const email = settings?.businessEmail?.trim()
  const whatsapp = settings?.whatsappNumber?.trim()
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '').replace(/^0/, '234')}` : undefined

  const [query, setQuery] = useState('')
  const { tokens, categories: searchCategories, total } = useMemo(() => searchHelpFaqs(helpCategories, query), [query])
  const isSearching = tokens.length > 0

  const clearSearch = () => setQuery('')

  const handleCategoryJump = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    const section = document.getElementById(id)
    if (!section) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    const heading = section.querySelector<HTMLElement>('h2')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus({ preventScroll: true })
  }

  return (
    <>
      <Seo
        title={HELP_TITLE}
        description={HELP_DESCRIPTION}
        canonicalPath="/help"
        jsonLd={getBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Help', path: '/help' }])}
      />
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-10 sm:py-14 lg:py-16">
            <Breadcrumb className="mb-7" items={[{ label: 'Home', href: '/' }, { label: 'Help' }]} />
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
                <span className="inline-block size-2 rounded-full bg-orange" />
                Help centre
              </p>
              <h1 className="m-0 text-4xl font-bold leading-tight tracking-[-0.05em] text-green-dark sm:text-5xl">
                How can we help?
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                Find answers about shopping, orders, payment, delivery and accounts — or get in touch with our team
                directly.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-14 sm:py-18 lg:py-24" aria-labelledby="help-topics-heading">
          <div className="mx-auto max-w-2xl">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search for help…"
              ariaLabel="Search help questions and answers"
              inputProps={{ 'aria-controls': 'help-search-results' }}
            />
            {isSearching && (
              <p className="help-search-meta" role="status" aria-live="polite">
                {total === 0
                  ? `No results found for “${query.trim()}”.`
                  : `We found ${total} ${total === 1 ? 'result' : 'results'} for “${query.trim()}”.`}
              </p>
            )}
          </div>

          <div className="mt-12 max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-orange">
              {isSearching ? 'Search results' : 'Browse help topics'}
            </p>
            <h2 id="help-topics-heading" className="m-0 text-3xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-4xl">
              {isSearching ? `Results for “${query.trim()}”` : 'What do you need help with?'}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              {isSearching
                ? 'These questions and answers match the words you searched for.'
                : 'Choose a topic to jump to its questions and answers.'}
            </p>
          </div>

          <div id="help-search-results">
            {isSearching ? (
              searchCategories ? (
                <div>
                  <HelpCategoryGrid categories={searchCategories} query={query} />
                  <div className="mt-16">
                    <button
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-bold text-green transition-colors hover:border-green/50 hover:bg-sage/20"
                      type="button"
                      onClick={clearSearch}
                    >
                      ← Browse all help topics
                    </button>
                  </div>
                </div>
              ) : (
                <div className="help-no-results">
                  <span className="help-no-results-icon" aria-hidden="true">
                    <HelpIcon size={28} />
                  </span>
                  <h3>Sorry, we couldn’t find an answer.</h3>
                  <p>Try different words, or contact our team and we’ll be happy to help with your question.</p>
                  <div className="help-no-results-actions">
                    <Link className="rounded-xl bg-orange px-6 py-3 font-bold text-white transition-colors hover:bg-orange/90" to="/contact">
                      Contact support
                    </Link>
                    {whatsappHref && (
                      <a
                        className="rounded-xl border border-line bg-white px-6 py-3 font-bold text-green transition-colors hover:bg-sage/20"
                        href={whatsappHref}
                      >
                        Chat on WhatsApp
                      </a>
                    )}
                  </div>
                  <button className="help-no-results-reset" type="button" onClick={clearSearch}>
                    Clear search
                  </button>
                </div>
              )
            ) : (
              <>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                  {helpCategories.map(({ icon: Icon, id, title }) => (
                    <a
                      className="help-category-anchor rounded-2xl border border-line bg-white p-6 transition-colors hover:border-green/40"
                      href={`#${id}`}
                      key={id}
                      onClick={(event) => handleCategoryJump(event, id)}
                    >
                      <span className="grid size-12 place-items-center rounded-2xl bg-green/10 text-green" aria-hidden="true">
                        <Icon size={22} />
                      </span>
                      <span className="mt-5 block text-lg font-bold text-green-dark">{title}</span>
                      <span className="mt-2 flex items-center gap-1.5 text-sm font-bold text-green">
                        View answers <ArrowUpRight size={15} />
                      </span>
                    </a>
                  ))}
                </div>

                <HelpCategoryGrid categories={helpCategories} query={query} />

                <div className="mt-16" aria-labelledby="help-shortcuts-heading">
                  <p id="help-shortcuts-heading" className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                    Popular shortcuts
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {quickLinks.map((link) => (
                      <Link
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-bold text-green transition-colors hover:border-green/50 hover:bg-sage/20"
                        to={link.href}
                        key={link.href}
                      >
                        {link.label} <ArrowUpRight size={15} />
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <StillNeedHelpSection phone={phone} email={email} whatsappHref={whatsappHref} />
      </main>
      <Footer />
    </>
  )
}