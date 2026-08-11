import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  {
    name: 'Rice',
    slug: 'rice',
    image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=720&q=85',
  },
  {
    name: 'Beans',
    slug: 'beans',
    image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=720&q=85',
  },
  {
    name: 'Oil',
    slug: 'oil',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=720&q=85',
  },
  {
    name: 'Yam',
    slug: 'yam',
    image: 'https://images.unsplash.com/photo-1596097557993-7c9d65f4c498?auto=format&fit=crop&w=720&q=85',
  },
  {
    name: 'Spices',
    slug: 'spices',
    image: 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=720&q=85',
  },
]

const products = [
  {
    categorySlug: 'rice',
    name: 'Premium Jasmine Rice',
    slug: 'jasmine-rice',
    description: 'Fragrant, long-grain jasmine rice for everyday family meals.',
    price: '18500.00',
    unit: '5 kg bag',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=720&q=85',
    stockQuantity: 50,
  },
  {
    categorySlug: 'beans',
    name: 'Clean Honey Beans',
    slug: 'honey-beans',
    description: 'Clean, wholesome honey beans with a rich, satisfying flavour.',
    price: '7200.00',
    unit: '2 kg bag',
    image: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=720&q=85',
    stockQuantity: 40,
  },
  {
    categorySlug: 'oil',
    name: 'Pure Vegetable Oil',
    slug: 'vegetable-oil',
    description: 'Pure vegetable oil for cooking, frying, and family recipes.',
    price: '8500.00',
    unit: '2 litres',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=720&q=85',
    stockQuantity: 30,
  },
  {
    categorySlug: 'yam',
    name: 'Fresh White Yam',
    slug: 'white-yam',
    description: 'Fresh white yam sourced for hearty, comforting meals.',
    price: '4500.00',
    unit: '1 tuber',
    image: 'https://images.unsplash.com/photo-1596097557993-7c9d65f4c498?auto=format&fit=crop&w=720&q=85',
    stockQuantity: 25,
  },
]

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    })
  }

  for (const product of products) {
    const { categorySlug, ...productData } = product

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        ...productData,
        stockQuantity: product.stockQuantity,
        category: { connect: { slug: categorySlug } },
      },
      create: {
        ...productData,
        category: { connect: { slug: categorySlug } },
      },
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error: unknown) => {
    console.error('Prisma seed failed', error)
    await prisma.$disconnect()
    process.exitCode = 1
  })