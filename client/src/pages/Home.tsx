import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { CategoryRail } from '../components/home/CategoryRail'
import { ContactSection } from '../components/home/ContactSection'
import { Hero } from '../components/home/Hero'
import { HomeTrustStrip } from '../components/home/HomeTrustStrip'
import { PromoBanners } from '../components/home/PromoBanners'
import { ProductRail } from '../components/home/ProductRail'
import { Testimonials } from '../components/home/Testimonials'
import { PublicBreadcrumb } from '../components/ui/Breadcrumb'
import { useHomeCatalog } from '../hooks/useHomeCatalog'
import { usePromotionalBanners } from '../hooks/usePromotionalBanners'
import { Seo } from '../seo/Seo'
import { DEFAULT_SITE_DESCRIPTION, HOMEPAGE_TITLE, getOrganizationSchema } from '../seo/config'

export function Home() {
  const catalog = useHomeCatalog()
  const promotionalBanners = usePromotionalBanners()

  return <>
    <Seo title={HOMEPAGE_TITLE} description={DEFAULT_SITE_DESCRIPTION} canonicalPath="/" jsonLd={getOrganizationSchema()} />
    <Navbar />
    <PublicBreadcrumb items={[{ label: 'Home' }]} />
    <main>
      <Hero />
      <PromoBanners banners={promotionalBanners} />
      <CategoryRail categories={catalog.categories} isLoading={catalog.isLoading} hasError={catalog.errors.categories} onRetry={catalog.retry} />
      <ProductRail title="Featured products" eyebrow="Handpicked for you" products={catalog.featuredProducts} isLoading={catalog.isLoading} hasError={catalog.errors.featured} onRetry={catalog.retry} hideWhenEmpty />
      <ProductRail title="Popular right now" eyebrow="Customer favourites" products={catalog.popularProducts} isLoading={catalog.isLoading} hasError={catalog.errors.popular} onRetry={catalog.retry} />
      <ProductRail title="Fresh on the shelf" eyebrow="New arrivals" products={catalog.newArrivals} isLoading={catalog.isLoading} hasError={catalog.errors.newArrivals} onRetry={catalog.retry} href="/new-arrivals" tone="yellow" />
      <HomeTrustStrip />
      <Testimonials />
      <ContactSection />
    </main>
    <Footer />
  </>
}