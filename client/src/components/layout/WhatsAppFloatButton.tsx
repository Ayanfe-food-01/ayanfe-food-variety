import { WhatsAppIcon } from '../../assets/icons'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { whatsAppChatUrl } from '../../utils/whatsApp'

// Floating WhatsApp chat launcher shown on the storefront. Fixed at the
// bottom-right while scrolling; hidden while any higher overlay (menu, cart
// drawer, modals) is open. Uses the business WhatsApp number from store
// settings and is not rendered when that number is not configured.
export function WhatsAppFloatButton() {
  const { settings } = useStoreSettings()
  const whatsappNumber = settings?.whatsappNumber?.trim()
  if (!whatsappNumber) return null

  return (
    <a
      className="fixed bottom-[18px] right-[18px] z-[55] grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_12px_26px_#18271440] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_#1827144d] max-[767px]:bottom-[14px] max-[767px]:right-[14px] max-[767px]:size-[52px] motion-reduce:transition-none motion-reduce:hover:transform-none"
      href={whatsAppChatUrl(whatsappNumber)}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
    >
      <WhatsAppIcon size={26} />
    </a>
  )
}