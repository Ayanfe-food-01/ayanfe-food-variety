// Builds the wa.me chat link from the business WhatsApp number configured in
// the store settings. Shared so storefront entry points normalize the number
// the same way (see Contact and Footer).
export const whatsAppChatUrl = (whatsappNumber: string): string =>
  `https://wa.me/${whatsappNumber.replace(/\D/g, '').replace(/^0/, '234')}`