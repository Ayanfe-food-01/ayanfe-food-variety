import { CheckIcon, ShieldIcon, TruckIcon } from '../../assets/icons'

const trustPoints = [
  { icon: <ShieldIcon size={20} />, title: 'Quality checked', text: 'Carefully selected essentials' },
  { icon: <TruckIcon size={20} />, title: 'Easy delivery', text: 'Order from home with ease' },
  { icon: <CheckIcon size={20} />, title: 'Helpful service', text: 'We are here when you need us' },
]

export function HomeTrustStrip() {
  return <section className="trust-strip" aria-label="Why shop with Ayanfe">
    <div className="container trust-grid">
      {trustPoints.map((point) => <div className="trust-point" key={point.title}>
        <span className="trust-icon" aria-hidden="true">{point.icon}</span>
        <span><strong>{point.title}</strong><small>{point.text}</small></span>
      </div>)}
    </div>
  </section>
}