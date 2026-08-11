import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/http.js'
import type {
  CheckoutInput,
  CreateOrderInput,
  OrderItemResponse,
  OrderResponse,
} from './order.types.js'
import { notifyOrderCreated } from './order.email.js'

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    orderItems: {
      include: {
        product: {
          select: {
            id: true
            slug: true
            image: true
          }
        }
      }
    }
  }
}>

const toOrderResponse = (order: OrderWithItems): OrderResponse => ({
  id: order.id,
  orderNumber: order.orderNumber,
  customerName: order.customerName,
  phone: order.phone,
  whatsapp: order.whatsapp,
  email: order.email,
  deliveryAddress: order.deliveryAddress,
  city: order.city,
  note: order.note,
  subtotal: order.subtotal.toString(),
  deliveryFee: order.deliveryFee.toString(),
  total: order.total.toString(),
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
  orderItems: order.orderItems.map(
    (item): OrderItemResponse => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice.toString(),
      quantity: item.quantity,
      subtotal: item.subtotal.toString(),
      product: item.product,
    }),
  ),
})

const orderInclude = {
  orderItems: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          image: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude

export async function createOrder(input: CreateOrderInput): Promise<OrderResponse> {
  return prisma.$transaction(async (transaction) => {
    const productIds = input.items.map((item) => item.productId)
    const products = await transaction.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    })
    const productsById = new Map(products.map((product) => [product.id, product]))
    const unavailableProductIds = productIds.filter((productId) => !productsById.has(productId))

    if (unavailableProductIds.length > 0) {
      throw new HttpError(400, 'One or more products are unavailable')
    }

    const orderItems = input.items.map((item) => {
      const product = productsById.get(item.productId)
      if (!product) {
        throw new Error('Product lookup failed')
      }

      const subtotal = product.price.mul(item.quantity)
      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal,
      }
    })
    const subtotal = orderItems.reduce(
      (total, item) => total.add(item.subtotal),
      new Prisma.Decimal(0),
    )
    const orderNumber = await nextOrderNumber(transaction)

    const order = await transaction.order.create({
      data: {
        orderNumber,
        userId: input.userId,
        customerName: input.customerName,
        phone: input.phone,
        whatsapp: input.whatsapp,
        email: input.email,
        deliveryAddress: input.deliveryAddress,
        city: input.city,
        note: input.note,
        subtotal,
        deliveryFee: new Prisma.Decimal(0),
        total: subtotal,
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PENDING,
        orderItems: {
          create: orderItems,
        },
      },
      include: orderInclude,
    })

    if (input.userId) {
      await transaction.user.update({
        where: { id: input.userId },
        data: { phone: input.phone },
      })
    }

    return toOrderResponse(order)
  })
}

const nextOrderNumber = async (transaction: Prisma.TransactionClient): Promise<string> => {
  const result = await transaction.$queryRaw<Array<{ nextval: bigint }>>(
    Prisma.sql`SELECT nextval('orders_order_number_seq')`,
  )
  const sequence = Number(result[0]?.nextval)
  return `AFV-${new Date().getUTCFullYear()}-${String(sequence).padStart(6, '0')}`
}

export async function checkoutCustomerCart(userId: string, input: CheckoutInput): Promise<OrderResponse> {
  const result = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    })
    if (!user || user.role !== 'CUSTOMER') throw new HttpError(403, 'Customer access is required.')

    const cart = await transaction.customerCart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!cart || cart.items.length === 0) throw new HttpError(400, 'Your cart is empty.')

    const unavailable = cart.items.filter((item) => !item.product.isActive)
    if (unavailable.length > 0) throw new HttpError(400, 'One or more cart products are no longer available.')
    const invalidQuantity = cart.items.find((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000)
    if (invalidQuantity) throw new HttpError(400, 'One or more cart quantities are invalid.')

    const orderItems = cart.items.map((item) => {
      const subtotal = item.product.price.mul(item.quantity)
      return {
        productId: item.product.id,
        productName: item.product.name,
        unitPrice: item.product.price,
        quantity: item.quantity,
        subtotal,
      }
    })
    const subtotal = orderItems.reduce(
      (total, item) => total.add(item.subtotal),
      new Prisma.Decimal(0),
    )
    const deliveryFee = new Prisma.Decimal(0)
    const order = await transaction.order.create({
      data: {
        orderNumber: await nextOrderNumber(transaction),
        userId: user.id,
        customerName: input.customerName,
        phone: input.phone,
        email: user.email,
        deliveryAddress: input.deliveryAddress,
        city: input.city,
        note: input.note,
        subtotal,
        deliveryFee,
        total: subtotal.add(deliveryFee),
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.PENDING,
        orderItems: { create: orderItems },
      },
      include: orderInclude,
    })

    await transaction.user.update({ where: { id: user.id }, data: { phone: input.phone } })
    await transaction.customerCartItem.deleteMany({ where: { cartId: cart.id } })
    return order
  })

  const bank = await prisma.paymentSettings.findFirst({
    where: { singletonKey: 'default', isActive: true },
    select: { bankName: true, accountName: true, accountNumber: true, instructions: true },
  })
  void notifyOrderCreated({
    orderNumber: result.orderNumber,
    customerName: result.customerName,
    customerEmail: result.email,
    total: result.total.toString(),
    items: result.orderItems.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      subtotal: item.subtotal.toString(),
    })),
    bank,
  }).catch((error: unknown) => console.error('Order confirmation email failed', error))

  return toOrderResponse(result)
}

export async function listCustomerOrders(userId: string): Promise<OrderResponse[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: orderInclude,
  })
  return orders.map(toOrderResponse)
}

export async function getCustomerOrder(userId: string, id: string): Promise<OrderResponse | null> {
  const order = await prisma.order.findFirst({
    where: { id, userId },
    include: orderInclude,
  })
  return order ? toOrderResponse(order) : null
}

export async function getCustomerOrderByNumber(userId: string, orderNumber: string): Promise<OrderResponse | null> {
  const order = await prisma.order.findFirst({
    where: { orderNumber, userId },
    include: orderInclude,
  })
  return order ? toOrderResponse(order) : null
}

export async function getOrderById(id: string): Promise<OrderResponse | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  })

  return order ? toOrderResponse(order) : null
}