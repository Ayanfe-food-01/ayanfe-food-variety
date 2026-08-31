-- Adds PAYSTACK as an accepted Order.paymentMethod so checkout can store
-- orders intended for the online gateway. Bank-transfer remains the default.
ALTER TYPE "PaymentMethod" ADD VALUE 'PAYSTACK';