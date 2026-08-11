import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { CategorySection } from '../components/home/CategorySection'
import { ContactSection } from '../components/home/ContactSection'
import { FeaturedProducts } from '../components/home/FeaturedProducts'
import { Hero } from '../components/home/Hero'
import { PromotionalCTA } from '../components/home/PromotionalCTA'
import { WhyChooseUs } from '../components/home/WhyChooseUs'

export function Home() {
  return (
    <>
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