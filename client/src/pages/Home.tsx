import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { CategorySection } from '../components/home/CategorySection'
import { ContactSection } from '../components/home/ContactSection'
import { FeaturedProducts } from '../components/home/FeaturedProducts'
import { Hero } from '../components/home/Hero'
import { PromotionalCTA } from '../components/home/PromotionalCTA'
import { WhyChooseUs } from '../components/home/WhyChooseUs'
import { Seo } from '../seo/Seo'
import { DEFAULT_SITE_DESCRIPTION, DEFAULT_SOCIAL_IMAGE_PATH, getAbsoluteUrl, getSiteUrl, SITE_NAME } from '../seo/config'

export function Home() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: getSiteUrl(),
    logo: getAbsoluteUrl(DEFAULT_SOCIAL_IMAGE_PATH),
    description: DEFAULT_SITE_DESCRIPTION,
  }

  return (
    <>
      <Seo
        title="Ayanfe Food Variety | Nigerian foodstuff and everyday groceries"
        description={DEFAULT_SITE_DESCRIPTION}
        canonicalPath="/"
        jsonLd={organizationSchema}
      />
      <Navbar />
      <main>
        <Hero />
        <CategorySection />
        <FeaturedProducts />
        <WhyChooseUs />
        <PromotionalCTA />
        <ContactSection />
      </main>
      <Footer />
    </>
  )
}