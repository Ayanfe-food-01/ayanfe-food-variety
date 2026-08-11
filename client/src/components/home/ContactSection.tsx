import { ArrowUpRight, MailIcon, PhoneIcon } from '../../assets/icons'

export function ContactSection() {
  return (
    <section className="bg-cream py-20" id="contact">
      <div className="mx-auto grid w-[calc(100%-32px)] max-w-[1160px] items-end gap-10 md:w-[calc(100%-48px)] lg:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange"><span className="inline-block size-2 rounded-full bg-orange" /> Need a hand?</div>
          <h2 className="m-0 text-4xl font-bold leading-tight tracking-[-0.04em] text-green-dark sm:text-5xl">Let’s talk about your next order.</h2>
          <p className="mt-5 max-w-[470px] text-base leading-7 text-muted">We’re just a message away. Reach out and let’s help you find what you need.</p>
        </div>
        <div className="flex flex-col items-start gap-4 md:flex-row md:flex-wrap md:items-center lg:justify-end">
          <a className="inline-flex items-center gap-3 text-sm font-bold text-green" href="tel:08125595879"><span className="text-orange"><PhoneIcon size={19} /></span><span><small className="block text-[10px] font-medium uppercase tracking-[0.12em] text-muted">Call us</small>08125595879</span></a>
          <a className="inline-flex items-center gap-3 text-sm font-bold text-green" href="mailto:Ayanfefoodvariety@gmail.com"><span className="text-orange"><MailIcon size={19} /></span><span><small className="block text-[10px] font-medium uppercase tracking-[0.12em] text-muted">Email us</small>Ayanfefoodvariety@gmail.com</span></a>
          <a className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-cream transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-dark" href="https://wa.me/2348125595879" target="_blank" rel="noreferrer">WhatsApp us <ArrowUpRight size={18} /></a>
        </div>
      </div>
    </section>
  )
}