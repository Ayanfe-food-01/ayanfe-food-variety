import { expect, test, type Page } from 'playwright/test'

const APP_URL = process.env.UI_APP_URL || 'http://127.0.0.1:5000'
const EMAIL = process.env.UI_TEST_CUSTOMER_EMAIL || 'ui-browser-smoke@example.com'
const PASSWORD = process.env.UI_TEST_CUSTOMER_PASSWORD || 'UIBrowserTest!2345'

const uniqueSuffix = Date.now().toString(36)

async function signIn(page: Page) {
  await page.goto(APP_URL)
  await page.getByRole('button', { name: /Sign in/i }).first().click()
  await page.getByRole('button', { name: 'Continue with Email' }).click()
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Account' }).first()).toBeVisible({ timeout: 15000 })
}

test.describe.configure({ mode: 'serial' })
test.describe('account + checkout browser smoke', () => {
  test('1. sign in flow from the storefront', async ({ page }) => {
    await signIn(page)
    // Signing in again with the same session must not surface an error.
    await expect(page.getByText(EMAIL).first()).toBeVisible({ timeout: 15000 })
  })

  test('2. /account identity header + single-field profile edits persist', async ({ page }) => {
    await signIn(page)
    await page.goto(`${APP_URL}/account`)
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Browser Smoke Tester').first()).toBeVisible()
    await expect(page.getByText(EMAIL).first()).toBeVisible()

    // Full name is edited one field at a time, not a dense form.
    const renamed = `Browser Smoke Renamed ${uniqueSuffix}`
    await page.getByRole('button', { name: 'Edit full name' }).click()
    const fullNameInput = page.getByLabel('Full name')
    await expect(fullNameInput).toHaveValue('Browser Smoke Tester')
    await fullNameInput.fill(renamed)
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText(renamed).first()).toBeVisible({ timeout: 15000 })

    // Email address row shows the account email and is not editable.
    await expect(page.getByText('Contact us to change it').first()).toBeVisible()
  })

  test('3. saved address add/set-default edits persist', async ({ page }) => {
    await signIn(page)
    await page.goto(`${APP_URL}/account`)
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /add new/i }).click()

    const labelField = page.getByLabel('Address label')
    await labelField.fill(`Browser Home ${uniqueSuffix}`)
    await page.getByLabel('Recipient name').fill('Browser Recipient')
    await page.locator('#address-phone').fill('+2348011122233')

    // State picker
    await page.getByRole('combobox', { name: 'State' }).click()
    await page.getByRole('option', { name: /Lagos/ }).first().click()
    // LGA / City picker
    await page.getByRole('combobox', { name: 'LGA or city' }).click()
    await page.getByRole('option', { name: /Victoria Island|Ikeja|Lagos Mainland/ }).first().click()

    await page.getByLabel('Street / full address').fill('12 Browser Crescent, Estate Road')
    await page.getByLabel('Delivery instructions').fill('Ring twice')
    await page.getByText('Set as default delivery address').click()
    await page.getByRole('button', { name: 'Add address', exact: true }).click()

    await expect(page.getByText(`Browser Home ${uniqueSuffix}`).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('12 Browser Crescent, Estate Road').first()).toBeVisible()
    await expect(page.getByText('Default', { exact: true }).first()).toBeVisible()
  })

  test('4. More section links to the change-password and notification pages', async ({ page }) => {
    await signIn(page)
    await page.goto(`${APP_URL}/account`)
    await expect(page.getByText('Order history').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Change password').first()).toBeVisible()
    await expect(page.getByText('Notification preferences').first()).toBeVisible()
    await expect(page.getByText('Log out').first()).toBeVisible()

    await page.getByText('Change password').first().click()
    await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByLabel('Current password')).toBeVisible()
    await expect(page.getByLabel('New password')).toBeVisible()
    await expect(page.getByLabel('Confirm new password')).toBeVisible()

    await page.goto(`${APP_URL}/account/notifications`)
    await expect(page.getByRole('heading', { name: 'Notification preferences' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Order updates').first()).toBeVisible()
    await expect(page.getByText(EMAIL).first()).toBeVisible()
  })

  test('5. checkout auto-applies the saved default address', async ({ page }) => {
    await signIn(page)
    // Seed the customer cart through the API using this browser context's session cookie.
    const seedOk = await page.evaluate(async () => {
      const catalogue = await fetch('/api/v1/products?limit=1', { headers: { Accept: 'application/json' } })
      if (!catalogue.ok) return 'catalog-fetch-failed'
      const data = await catalogue.json()
      const product = data?.data?.products?.[0] ?? data?.products?.[0]
      if (!product?.id) return 'no-product'
      const req = await fetch('/api/v1/customer/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ productId: product.id, quantity: 1 }] }),
      })
      return req.ok ? 'ok' : `cart-failed-${req.status}`
    })
    expect(seedOk).toBe('ok')

    await page.goto(`${APP_URL}/checkout`)
    await expect(page.getByText('Saved address').first()).toBeVisible({ timeout: 20000 })

    // The default saved address is applied to the delivery fields.
    const addressField = page.getByLabel('Delivery address')
    await expect(addressField).toHaveValue(/Browser Crescent/i)
    await expect(page.getByRole('combobox', { name: 'State' }).first()).toHaveText(/Lagos/i)
  })

  test('6. guest device-save guard (no write before a successful order)', async ({ browser }) => {
    const guestContext = await browser.newContext()
    const guestPage = await guestContext.newPage()
    await guestPage.goto(`${APP_URL}/checkout`)
    // The guest save checkbox is only on the guest checkout (no session).
    const saveCheckbox = guestPage.getByText('Save my details on this device')
    if (await saveCheckbox.isVisible().catch(() => false)) {
      await guestPage.getByLabel('Full name').first().fill('Guest Device Tester')
      await guestPage.getByLabel('Phone').first().fill('+2348022233344')
      await guestPage.getByLabel('Email').first().fill(`guest-device-${uniqueSuffix}@example.com`)
      await saveCheckbox.click()
    }
    // Without a successful order nothing may be stored on the device.
    let stored: string | null = 'not-read'
    await guestPage.waitForTimeout(500)
    stored = await guestPage.evaluate(() => window.localStorage.getItem('ayanfe-guest-saved-details'))
    expect(stored).toBeNull()
    await guestContext.close()
  })

  test('7. loading the account page while signed out shows the sign-in prompt', async ({ browser }) => {
    const anonContext = await browser.newContext()
    const anonPage = await anonContext.newPage()
    await anonPage.goto(`${APP_URL}/account`)
    await expect(anonPage.getByRole('heading', { name: 'Sign in to manage your account' })).toBeVisible({ timeout: 15000 })
    await anonContext.close()
  })
})