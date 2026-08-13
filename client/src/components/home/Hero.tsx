import { Link } from 'react-router-dom'
import { ArrowRight, TruckIcon } from '../../assets/icons'
import { PromoBanner } from './PromoBanner'

export function Hero() {
  return <>
    <PromoBanner />
    <section className="home-hero" id="home" aria-labelledby="home-heading">
      <div className="container home-hero-inner">
        <div className="home-hero-copy">
          <p className="eyebrow">Your trusted foodstuff market</p>
          <h1 id="home-heading"><em>Quality</em> Nigerian Foodstuff, Delivered to Your Doorstep.</h1>
          <p>Shop fresh, carefully selected food essentials and more, conveniently delivered to your home.</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/shop">Shop all products <ArrowRight size={17} /></Link>
            <span className="hero-note"><TruckIcon size={17} /> Simple ordering, helpful service</span>
          </div>
        </div>
      </div>
    </section>
  </>
}