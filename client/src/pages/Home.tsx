import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { CategoryRail } from '../components/home/CategoryRail'
import { ContactSection } from '../components/home/ContactSection'
import { Hero } from '../components/home/Hero'
import { HomeTrustStrip } from '../components/home/HomeTrustStrip'
import { ProductRail } from '../components/home/ProductRail'
import { useHomeCatalog } from '../hooks/useHomeCatalog'
import { Seo } from '../seo/Seo'
import { DEFAULT_SITE_DESCRIPTION, DEFAULT_SOCIAL_IMAGE_PATH, getAbsoluteUrl, getSiteUrl, SITE_NAME } from '../seo/config'

export function Home() {
  const catalog = useHomeCatalog()
  const organizationSchema = { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: getSiteUrl(), logo: getAbsoluteUrl(DEFAULT_SOCIAL_IMAGE_PATH), description: DEFAULT_SITE_DESCRIPTION }

  return <>
    <Seo title="Ayanfe Food Variety | Nigerian foodstuff and everyday groceries" description={DEFAULT_SITE_DESCRIPTION} canonicalPath="/" jsonLd={organizationSchema} />
    <Navbar />
    <main>
      <Hero />
      <CategoryRail categories={catalog.categories} isLoading={catalog.isLoading} hasError={catalog.errors.categories} onRetry={catalog.retry} />
      <ProductRail title="Popular right now" eyebrow="Customer favourites" products={catalog.featured} isLoading={catalog.isLoading} hasError={catalog.errors.featured} onRetry={catalog.retry} />
      <ProductRail title="Fresh on the shelf" eyebrow="New arrivals" products={catalog.newArrivals} isLoading={catalog.isLoading} hasError={catalog.errors.newArrivals} onRetry={catalog.retry} href="/new-arrivals" tone="yellow" />
      <HomeTrustStrip />
      <ContactSection />
    </main>
    <Footer />
  </>
}