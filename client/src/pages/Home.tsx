import { useMemo } from 'react'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { CategoryRail } from '../components/home/CategoryRail'
import { CategoryProductSections } from '../components/home/CategoryProductSections'
import { ContactSection } from '../components/home/ContactSection'
import { PromoBanner } from '../components/home/PromoBanner'
import { PromoBanners } from '../components/home/PromoBanners'
import { ProductRail } from '../components/home/ProductRail'
import { Testimonials } from '../components/home/Testimonials'
import { WhyChooseUs } from '../components/home/WhyChooseUs'
import { NewsletterSignup } from '../components/home/NewsletterSignup'
import { useHomeCatalog } from '../hooks/useHomeCatalog'
import { usePromotionalBanners } from '../hooks/usePromotionalBanners'
import { Seo } from '../seo/Seo'
import { DEFAULT_SITE_DESCRIPTION, HOMEPAGE_TITLE, getAbsoluteUrl, getOrganizationSchema } from '../seo/config'

export function Home() {
  const catalog = useHomeCatalog()
  const { banners: promotionalBanners, isLoading: bannersLoading } = usePromotionalBanners()

  const homepageProducts = [
    ...catalog.featuredProducts,
    ...catalog.popularProducts,
    ...catalog.newArrivals,
  ].filter((product, index, products) => products.findIndex((item) => item.id === product.id) === index).slice(0, 24)

  const homepageJsonLd = useMemo(() => {
    const organization = getOrganizationSchema() as { '@graph'?: Array<Record<string, unknown>>; [key: string]: unknown }
    const graph = organization['@graph'] ?? []
    if (homepageProducts.length > 0) {
      graph.push({
        '@type': 'ItemList',
        name: 'Featured, popular and new Ayanfe Food Variety products',
        numberOfItems: homepageProducts.length,
        itemListElement: homepageProducts.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            name: product.name,
            image: getAbsoluteUrl(product.image),
            url: getAbsoluteUrl(`/product/${product.slug ?? product.id}`),
          },
        })),
      })
    }
    return organization
  }, [homepageProducts])

  return <>
    <Seo title={HOMEPAGE_TITLE} description={DEFAULT_SITE_DESCRIPTION} canonicalPath="/" jsonLd={homepageJsonLd} />
    <Navbar />
    <PromoBanner />
    <main>
      <PromoBanners banners={promotionalBanners} isLoading={bannersLoading} />
      <CategoryRail categories={catalog.categories} isLoading={catalog.isLoading} hasError={catalog.errors.categories} onRetry={catalog.retry} />
      <ProductRail title="Featured products" eyebrow="Handpicked for you" products={catalog.featuredProducts} isLoading={catalog.isLoading} hasError={catalog.errors.featured} onRetry={catalog.retry} hideWhenEmpty imagePriority />
      <ProductRail title="Popular right now" eyebrow="Customer favourites" products={catalog.popularProducts} isLoading={catalog.isLoading} hasError={catalog.errors.popular} onRetry={catalog.retry} />
      <ProductRail title="Fresh on the shelf" eyebrow="New arrivals" products={catalog.newArrivals} isLoading={catalog.isLoading} hasError={catalog.errors.newArrivals} onRetry={catalog.retry} href="/new-arrivals" tone="yellow" />
      <CategoryProductSections categories={catalog.categories} sections={catalog.categorySections} isLoading={catalog.isLoading} hasError={catalog.errors.categorySections} onRetry={catalog.retry} />
      <WhyChooseUs />
      <Testimonials />
      <NewsletterSignup />
      <ContactSection />
    </main>
    <Footer />
  </>
}