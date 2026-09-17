import { CheckIcon, ShieldIcon, TruckIcon } from '../../assets/icons'

const trustPoints = [
  { icon: <ShieldIcon size={20} />, title: 'Quality checked', text: 'Carefully selected essentials' },
  { icon: <TruckIcon size={20} />, title: 'Easy delivery', text: 'Order from home with ease' },
  { icon: <CheckIcon size={20} />, title: 'Helpful service', text: 'We are here when you need us' },
]

export function HomeTrustStrip() {
  return <section className="bg-cream py-[25px]" aria-label="Why shop with Ayanfe">
    <div className="container grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-[18px]">
      {trustPoints.map((point) => <div className="flex items-center gap-2.5 border-b border-line pb-[10px] md:border-0 md:pb-0" key={point.title}>
        <span className="grid size-9 place-items-center rounded-full bg-sage text-green" aria-hidden="true">{point.icon}</span>
        <span><strong className="block text-[12px] font-bold text-green-dark">{point.title}</strong><small className="mt-0.5 block text-[10px] text-muted">{point.text}</small></span>
      </div>)}
    </div>
  </section>
}
