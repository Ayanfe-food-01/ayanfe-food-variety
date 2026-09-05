import { Link } from 'react-router-dom'
import { Footer } from '../components/layout/Footer'
import { Navbar } from '../components/layout/Navbar'
import { Breadcrumb } from '../components/ui/Breadcrumb'
import { ContactStep } from '../components/checkout/ContactStep'
import { DeliveryStep } from '../components/checkout/DeliveryStep'
import { PaymentStep } from '../components/checkout/PaymentStep'
import { ReviewStep } from '../components/checkout/ReviewStep'
import { OrderSummary } from '../components/checkout/OrderSummary'
import { EmptyCheckout } from '../components/checkout/EmptyCheckout'
import { CheckoutStepIndicator } from '../components/checkout/CheckoutStepIndicator'
import { CheckoutNavButtons } from '../components/checkout/CheckoutNavButtons'
import { CHECKOUT_STEPS, STEP_ORDER } from '../components/checkout/checkoutSteps'
import { useCheckoutWizard } from '../components/checkout/useCheckoutWizard'
import { useCart } from '../hooks/useCart'
import { useInitialRouteLoad } from '../hooks/useInitialRouteLoad'

export function Checkout() {
  const {
    items,
    mode,
    subtotal,
    totalQuantity,
    canCheckout,
    isLoading: isCartLoading,
    error: cartError,
    getItemSubtotal,
    refreshCart,
  } = useCart()
  const wizard = useCheckoutWizard({ items, subtotal, canCheckout, isCartLoading, refreshCart })

  useInitialRouteLoad(!wizard.isCustomerAuthLoading && !(isCartLoading && !wizard.isSubmitting))

  const stepNumber = STEP_ORDER.indexOf(wizard.step) + 1
  const stepMeta = CHECKOUT_STEPS[STEP_ORDER.indexOf(wizard.step)]
  const deliveryContinueDisabled = wizard.form.fulfillmentMethod === 'DELIVERY'
    && (wizard.isZoneResolving || (Boolean(wizard.form.city.trim()) && !wizard.resolvedZone))
  const paymentContinueDisabled = wizard.isPaymentLoading || wizard.paymentMethods.length === 0

  if (wizard.isCustomerAuthLoading || (isCartLoading && !wizard.isSubmitting)) {
    return (
      <>
        <Navbar />
        <main className="container py-16 sm:py-24" aria-label="Loading checkout">
          <div className="animate-pulse">
            <div className="h-12 w-48 rounded bg-sage" />
            <div className="mt-10 h-64 rounded-2xl bg-sage" />
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main><EmptyCheckout /></main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="border-b border-line/70 bg-sage/35">
          <div className="container py-8 sm:py-10">
            <Breadcrumb
              className="mb-6"
              items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]}
            />
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange">
              <span className="inline-block size-2 rounded-full bg-orange" />
              Almost there
            </p>
            <h1 className="m-0 text-4xl font-bold tracking-[-0.05em] text-green-dark sm:text-5xl">Checkout</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Choose pickup or delivery, confirm your details, and place your order securely.
            </p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-green-dark">
              Step {stepNumber} of {CHECKOUT_STEPS.length} — {stepMeta.label}
            </p>
            <div className="mt-4 sm:mt-5">
              <CheckoutStepIndicator currentStep={wizard.step} />
            </div>
          </div>
        </section>

        <section className="container py-12 sm:py-16 lg:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
            <div>
              {cartError && (
                <div className="rounded-2xl border border-orange/30 bg-orange/5 p-5 text-sm leading-6 text-orange" role="alert">
                  {cartError}
                </div>
              )}
              {wizard.needsCartReview && (
                <div className="rounded-2xl border border-orange/30 bg-orange/5 p-5 text-sm leading-6 text-orange" role="alert">
                  <p className="m-0 font-bold">Your cart needs attention before checkout.</p>
                  <p className="mt-1">{wizard.submitError ?? 'Refresh your cart and update unavailable items.'}</p>
                  <Link className="mt-3 inline-flex font-bold underline" to="/cart">Return to cart</Link>
                </div>
              )}

              <div key={wizard.step} className="checkout-step-in">
                {wizard.step === 'contact' && (
                  <>
                    <ContactStep form={wizard.form} errors={wizard.errors} isAuthenticated={wizard.isAuthenticated} onChange={wizard.updateField} />
                    <CheckoutNavButtons continueLabel="Continue to delivery" onContinue={wizard.handleContinue} />
                  </>
                )}

                {wizard.step === 'delivery' && (
                  <>
                    <DeliveryStep
                      form={wizard.form}
                      errors={wizard.errors}
                      fulfillmentMethod={wizard.form.fulfillmentMethod}
                      zone={wizard.resolvedZone}
                      isZoneResolving={wizard.isZoneResolving}
                      zoneError={wizard.zoneError}
                      deliveryFee={wizard.deliveryFee}
                      locations={wizard.locations}
                      locationsLoading={wizard.locationsLoading}
                      locationsError={wizard.locationsError}
                      onReloadLocations={wizard.loadLocations}
                      onChange={wizard.updateField}
                    />
                    <CheckoutNavButtons
                      continueLabel="Continue to payment"
                      onBack={wizard.handleBack}
                      onContinue={wizard.handleContinue}
                      continueDisabled={deliveryContinueDisabled}
                    />
                  </>
                )}

                {wizard.step === 'payment' && (
                  <>
                    <PaymentStep
                      methods={wizard.paymentMethods}
                      selectedMethod={wizard.form.paymentMethod}
                      selectedSettings={wizard.paymentSettings}
                      isLoading={wizard.isPaymentLoading}
                      error={wizard.paymentError}
                      onChange={(method) => wizard.updateField('paymentMethod', method)}
                    />
                    <CheckoutNavButtons
                      continueLabel="Continue to review"
                      onBack={wizard.handleBack}
                      onContinue={wizard.handleContinue}
                      continueDisabled={paymentContinueDisabled}
                    />
                  </>
                )}

                {wizard.step === 'review' && (
                  <>
                    <ReviewStep
                      form={wizard.form}
                      locations={wizard.locations}
                      resolvedZone={wizard.resolvedZone}
                      isZoneResolving={wizard.isZoneResolving}
                      deliveryFee={wizard.checkoutDeliveryFee}
                      paymentSettings={wizard.paymentSettings}
                      needsCartReview={wizard.needsCartReview}
                      submitError={wizard.submitError}
                      canPlaceOrder={!wizard.isSubmitting && canCheckout && !wizard.isPaymentLoading && Boolean(wizard.paymentSettings) && Boolean(wizard.form.fulfillmentMethod)}
                      isSubmitting={wizard.isSubmitting}
                      onPlaceOrder={wizard.placeOrder}
                      onEditStep={(target) => wizard.goToStep(target, false)}
                    />
                    <CheckoutNavButtons onBack={wizard.handleBack} />
                  </>
                )}
              </div>
            </div>

            <OrderSummary
              items={items}
              mode={mode}
              subtotal={subtotal}
              totalQuantity={totalQuantity}
              getItemSubtotal={getItemSubtotal}
              fulfillmentMethod={wizard.form.fulfillmentMethod}
              deliveryFee={wizard.checkoutDeliveryFee}
              isZoneResolving={wizard.isZoneResolving}
              resolvedZone={wizard.resolvedZone}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}