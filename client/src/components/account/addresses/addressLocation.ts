// Shared location-selection value for the account address form. Kept separate
// from the component module so the constant can be reused without breaking
// fast-refresh (modules that export only components).
export interface AddressLocationValue {
  stateId: string
  stateName: string
  cityId: string
  cityName: string
  areaId: string
  areaName: string
}

export const emptyAddressLocation: AddressLocationValue = {
  stateId: '',
  stateName: '',
  cityId: '',
  cityName: '',
  areaId: '',
  areaName: '',
}