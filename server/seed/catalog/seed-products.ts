import 'dotenv/config'
import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

type UploadedAsset = {
  url: string
  publicId: string
}

type CatalogCategory = {
  name: string
  slug: string
  description: string
  imageAsset: string
}

type CatalogProduct = {
  categorySlug: string
  name: string
  slug: string
  description: string
  price: string
  unit: string
  imageAsset: string
  stockQuantity: number
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL,
    },
  },
})

const seedDirectory = path.dirname(fileURLToPath(import.meta.url))
const assetDirectory = path.join(seedDirectory, 'assets')

const categories: CatalogCategory[] = [
  {
    name: 'Rice',
    slug: 'rice',
    description: 'Stone-free Ofada rice and carefully selected parboiled rice for everyday meals.',
    imageAsset: 'ofada-rice-2kg.png',
  },
  {
    name: 'Cooking Oils',
    slug: 'cooking-oils',
    description: 'Palm oil and vegetable oil in practical sizes for home cooking.',
    imageAsset: 'palm-oil-5l.jpg',
  },
  {
    name: 'Flours & Powders',
    slug: 'flours-powders',
    description: 'Traditional food flours for swallow, baking, and family recipes.',
    imageAsset: 'plantain-flour-500g.jpg',
  },
  {
    name: 'Breakfast & Cereals',
    slug: 'breakfast-cereals',
    description: 'Ogi, oat flour, and other nourishing breakfast staples.',
    imageAsset: 'ogi-powder-1-5kg.png',
  },
  {
    name: 'Snacks & Nuts',
    slug: 'snacks-nuts',
    description: 'Wholesome fruit and nut mixes made for convenient snacking.',
    imageAsset: 'fruit-and-nut-mix.jpg',
  },
]

const products: CatalogProduct[] = [
  {
    categorySlug: 'rice',
    name: 'Premium Ofada Rice 2kg',
    slug: 'premium-ofada-rice-2kg',
    description: 'Premium stone-free Ofada rice, cleaned and packed for rich, flavourful Nigerian meals.',
    price: '7500.00',
    unit: '2 kg bag',
    imageAsset: 'ofada-rice-2kg.png',
    stockQuantity: 25,
  },
  {
    categorySlug: 'rice',
    name: 'Premium Ofada Rice 5kg',
    slug: 'premium-ofada-rice-5kg',
    description: 'A family-size bag of premium stone-free Ofada rice for hearty meals and special occasions.',
    price: '18000.00',
    unit: '5 kg bag',
    imageAsset: 'ofada-rice-5kg.png',
    stockQuantity: 25,
  },
  {
    categorySlug: 'rice',
    name: 'Manny Gold Parboiled Rice',
    slug: 'manny-gold-parboiled-rice',
    description: 'Quality parboiled rice with separate grains for dependable everyday cooking.',
    price: '15000.00',
    unit: '5 kg bag',
    imageAsset: 'nigeria-parboiled-rice.jpg',
    stockQuantity: 25,
  },
  {
    categorySlug: 'cooking-oils',
    name: 'Pure Palm Oil 2kg',
    slug: 'pure-palm-oil-2kg',
    description: 'Rich, locally sourced palm oil for soups, stews, frying, and traditional recipes.',
    price: '6000.00',
    unit: '2 kg bottle',
    imageAsset: 'palm-oil-2kg.jpg',
    stockQuantity: 25,
  },
  {
    categorySlug: 'cooking-oils',
    name: 'Pure Palm Oil 3kg',
    slug: 'pure-palm-oil-3kg',
    description: 'Quality palm oil in a convenient family cooking size.',
    price: '8500.00',
    unit: '3 kg bottle',
    imageAsset: 'palm-oil-3kg.jpg',
    stockQuantity: 25,
  },
  {
    categorySlug: 'cooking-oils',
    name: 'Pure Palm Oil 5kg',
    slug: 'pure-palm-oil-5kg',
    description: 'A larger bottle of rich palm oil for regular family cooking and food businesses.',
    price: '13000.00',
    unit: '5 kg bottle',
    imageAsset: 'palm-oil-5kg.jpg',
    stockQuantity: 25,
  },
  {
    categorySlug: 'cooking-oils',
    name: 'Pure Palm Oil 5L',
    slug: 'pure-palm-oil-5l',
    description: 'Family-size palm oil for soups, stews, frying, and traditional Nigerian dishes.',
    price: '14000.00',
    unit: '5 litre bottle',
    imageAsset: 'palm-oil-5l.jpg',
    stockQuantity: 25,
  },
  {
    categorySlug: 'cooking-oils',
    name: 'Pure Vegetable Oil 2L',
    slug: 'pure-vegetable-oil-2l',
    description: 'Versatile vegetable oil for frying, baking, and everyday family meals.',
    price: '8500.00',
    unit: '2 litre bottle',
    imageAsset: 'vegetable-oil-2l.jpg',
    stockQuantity: 25,
  },
  {
    categorySlug: 'cooking-oils',
    name: 'Pure Vegetable Oil 3L',
    slug: 'pure-vegetable-oil-3l',
    description: 'A larger bottle of versatile vegetable oil for regular home cooking.',
    price: '12000.00',
    unit: '3 litre bottle',
    imageAsset: 'vegetable-oil-3l.jpg',
    stockQuantity: 25,
  },
  {
    categorySlug: 'flours-powders',
    name: 'Fufu Powder',
    slug: 'fufu-powder',
    description: 'Smooth fufu powder for preparing soft, satisfying swallow at home.',
    price: '4500.00',
    unit: '1 kg pouch',
    imageAsset: 'fufu-powder.png',
    stockQuantity: 25,
  },
  {
    categorySlug: 'flours-powders',
    name: 'Plantain Flour',
    slug: 'plantain-flour-500g',
    description: 'Plantain flour for swallow, baking, and creative family recipes.',
    price: '3000.00',
    unit: '500 g pouch',
    imageAsset: 'plantain-flour-500g.jpg',
    stockQuantity: 25,
  },
  {
    categorySlug: 'flours-powders',
    name: 'Potato Flour',
    slug: 'potato-flour-1kg',
    description: 'Finely milled potato flour for thickening, baking, and homemade recipes.',
    price: '5000.00',
    unit: '1 kg pouch',
    imageAsset: 'potato-flour-1kg.png',
    stockQuantity: 25,
  },
  {
    categorySlug: 'breakfast-cereals',
    name: 'Oat Flour',
    slug: 'oat-flour-500g',
    description: 'Oat flour for nourishing breakfasts, smoothies, and baking.',
    price: '4000.00',
    unit: '500 g pouch',
    imageAsset: 'oat-flour-500g.jpg',
    stockQuantity: 25,
  },
  {
    categorySlug: 'breakfast-cereals',
    name: 'Ogi Powder',
    slug: 'ogi-powder-500g',
    description: 'Extra-fine Ogi powder for a smooth, naturally fermented breakfast meal.',
    price: '2500.00',
    unit: '500 g pouch',
    imageAsset: 'ogi-powder-500g.jpg',
    stockQuantity: 25,
  },
  {
    categorySlug: 'breakfast-cereals',
    name: 'Ogi Paste',
    slug: 'ogi-paste-1kg',
    description: 'A convenient 1 kg pack of Ogi paste for quick, nourishing family breakfasts.',
    price: '3500.00',
    unit: '1 kg pouch',
    imageAsset: 'ogi-paste-1kg.png',
    stockQuantity: 25,
  },
  {
    categorySlug: 'breakfast-cereals',
    name: 'Ogi Powder 1.5kg',
    slug: 'ogi-powder-1-5kg',
    description: 'A larger pack of fine Ogi powder for families and regular breakfast preparation.',
    price: '5000.00',
    unit: '1.5 kg tub',
    imageAsset: 'ogi-powder-1-5kg.png',
    stockQuantity: 25,
  },
  {
    categorySlug: 'breakfast-cereals',
    name: 'Ogi Combo',
    slug: 'ogi-combo',
    description: 'A practical Ogi combo pack combining Ogi powder and paste for breakfast choices.',
    price: '5500.00',
    unit: '1 combo pack',
    imageAsset: 'ogi-combo.png',
    stockQuantity: 25,
  },
  {
    categorySlug: 'snacks-nuts',
    name: 'Fruit & Nut Mix',
    slug: 'fruit-and-nut-mix',
    description: 'A natural, high-fibre mix of oats, nuts, seeds, dried fruit, cinnamon, and honey.',
    price: '8000.00',
    unit: '500 g pouch',
    imageAsset: 'fruit-and-nut-mix.jpg',
    stockQuantity: 25,
  },
]

const mimeTypeFor = (fileName: string): string => {
  const extension = path.extname(fileName).toLowerCase()
  if (extension === '.png') return 'image/png'
  if (extension === '.webp') return 'image/webp'
  return 'image/jpeg'
}

const signatureFor = (parameters: Record<string, string>, apiSecret: string): string => {
  const payload = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return crypto.createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}

const uploadAsset = async (
  assetName: string,
  folder: 'product-images' | 'category-images',
): Promise<UploadedAsset> => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are required for catalog seeding.')
  }

  const filePath = path.join(assetDirectory, assetName)
  const file = await readFile(filePath)
  if (file.length > 5 * 1024 * 1024) {
    throw new Error(`Asset "${assetName}" is larger than the 5 MB image limit.`)
  }

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const publicId = crypto.randomUUID()
  const parameters = { folder, public_id: publicId, timestamp }
  const body = new FormData()
  const mimeType = mimeTypeFor(assetName)
  body.append('file', `data:${mimeType};base64,${file.toString('base64')}`)
  body.append('api_key', apiKey)
  body.append('timestamp', timestamp)
  body.append('folder', folder)
  body.append('public_id', publicId)
  body.append('signature', signatureFor(parameters, apiSecret))

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(30_000),
    },
  )
  const result = (await response.json().catch(() => null)) as {
    secure_url?: unknown
    public_id?: unknown
    error?: { message?: unknown }
  } | null

  if (!response.ok || typeof result?.secure_url !== 'string' || typeof result.public_id !== 'string') {
    const providerMessage = typeof result?.error?.message === 'string' ? result.error.message : 'unknown provider error'
    throw new Error(`Cloudinary rejected "${assetName}": ${providerMessage}`)
  }

  return { url: result.secure_url, publicId: result.public_id }
}

const deleteUploadedAsset = async (asset: UploadedAsset): Promise<void> => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const body = new FormData()
  body.append('public_id', asset.publicId)
  body.append('api_key', apiKey)
  body.append('timestamp', timestamp)
  body.append('signature', signatureFor({ public_id: asset.publicId, timestamp }, apiSecret))

  await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`,
    { method: 'POST', body, signal: AbortSignal.timeout(30_000) },
  ).catch(() => undefined)
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL && !process.env.NEON_DATABASE_URL) {
    throw new Error('A database connection is required for catalog seeding.')
  }

  const uploadedProducts = new Map<string, UploadedAsset>()
  const uploadedCategories = new Map<string, UploadedAsset>()

  try {
    console.log(`Uploading ${products.length} product images and ${categories.length} category images...`)
    for (const category of categories) {
      uploadedCategories.set(category.slug, await uploadAsset(category.imageAsset, 'category-images'))
    }
    for (const product of products) {
      uploadedProducts.set(product.slug, await uploadAsset(product.imageAsset, 'product-images'))
    }

    const result = await prisma.$transaction(async (transaction) => {
      const existingProducts = await transaction.product.findMany({
        select: {
          id: true,
          _count: {
            select: {
              orderItems: true,
              cartItems: true,
              stockAdjustments: true,
            },
          },
        },
      })

      const existingProductIds = existingProducts.map((product) => product.id)
      if (existingProductIds.length > 0) {
        await transaction.customerCartItem.deleteMany({
          where: { productId: { in: existingProductIds } },
        })
      }

      let removedProducts = 0
      let deactivatedProducts = 0
      for (const product of existingProducts) {
        const hasHistoricalReferences = product._count.orderItems > 0 || product._count.stockAdjustments > 0
        if (hasHistoricalReferences) {
          await transaction.product.update({
            where: { id: product.id },
            data: { isActive: false, stockQuantity: 0 },
          })
          deactivatedProducts += 1
        } else {
          await transaction.product.delete({ where: { id: product.id } })
          removedProducts += 1
        }
      }

      const categoryRows = new Map<string, { id: string }>()
      for (const category of categories) {
        const uploaded = uploadedCategories.get(category.slug)
        if (!uploaded) throw new Error(`Missing uploaded image for category "${category.name}".`)

        const row = await transaction.category.upsert({
          where: { slug: category.slug },
          update: {
            name: category.name,
            description: category.description,
            imageUrl: uploaded.url,
            imagePublicId: uploaded.publicId,
            isActive: true,
          },
          create: {
            name: category.name,
            slug: category.slug,
            description: category.description,
            imageUrl: uploaded.url,
            imagePublicId: uploaded.publicId,
            isActive: true,
          },
          select: { id: true },
        })
        categoryRows.set(category.slug, row)
      }

      const targetCategorySlugs = new Set(categories.map((category) => category.slug))
      const existingCategories = await transaction.category.findMany({
        select: {
          id: true,
          slug: true,
          _count: { select: { products: true } },
        },
      })
      let removedCategories = 0
      let deactivatedCategories = 0
      for (const category of existingCategories) {
        if (targetCategorySlugs.has(category.slug)) continue
        if (category._count.products > 0) {
          await transaction.category.update({
            where: { id: category.id },
            data: { isActive: false },
          })
          deactivatedCategories += 1
        } else {
          await transaction.category.delete({ where: { id: category.id } })
          removedCategories += 1
        }
      }

      for (const product of products) {
        const category = categoryRows.get(product.categorySlug)
        const uploaded = uploadedProducts.get(product.slug)
        if (!category || !uploaded) {
          throw new Error(`Seed data is incomplete for "${product.name}".`)
        }

        const created = await transaction.product.create({
          data: {
            categoryId: category.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.price,
            unit: product.unit,
            image: uploaded.url,
            isActive: true,
            stockQuantity: product.stockQuantity,
          },
        })

        await transaction.productStockAdjustment.create({
          data: {
            productId: created.id,
            quantityDelta: product.stockQuantity,
            previousQuantity: 0,
            newQuantity: product.stockQuantity,
            reason: 'Initial catalog seed',
          },
        })
      }

      return {
        removedProducts,
        deactivatedProducts,
        removedCategories,
        deactivatedCategories,
        categories: categories.length,
        products: products.length,
      }
    })

    console.log('Catalog seed completed successfully.')
    console.log(JSON.stringify(result))
  } catch (error) {
    await Promise.all([
      ...uploadedProducts.values(),
      ...uploadedCategories.values(),
    ].map(deleteUploadedAsset))
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error('Catalog seed failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})