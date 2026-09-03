import { isPossiblePhoneNumber } from 'react-phone-number-input'

export const isValidE164PhoneNumber = (value: string): boolean => {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 15) return false
  return isPossiblePhoneNumber(value)
}
