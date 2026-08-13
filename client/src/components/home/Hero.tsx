import { Link } from 'react-router-dom'
import { ArrowRight, SparkIcon, TruckIcon } from '../../assets/icons'
import { PromoBanner } from './PromoBanner'

export function Hero() {
  return <>
    <PromoBanner />
    <section className="home-hero" id="home" aria-labelledby="home-heading">
      <div className="container home-hero-inner">
        <div className="home-hero-copy">
          <p className="eyebrow">Your trusted foodstuff market</p>
          <h1 id="home-heading">Natural, gluten-free <em>Nigerian foodstuff online.</em></h1>
          <p>Shop preservative-free swallow flours, grains, oils and everyday pantry essentials, with fast, reliable delivery across Nigeria.</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/shop">Shop all products <ArrowRight size={17} /></Link>
            <span className="hero-note"><TruckIcon size={17} /> Simple ordering, helpful service</span>
          </div>
        </div>
        <div className="hero-card" aria-label="Ayanfe Food Variety promise">
          <span className="hero-card-icon"><SparkIcon size={23} /></span>
          <strong>Good food starts here.</strong>
          <span>Quality staples for everyday cooking.</span>
        </div>
      </div>
    </section>
  </>
}