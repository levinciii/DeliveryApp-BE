/*
  Warnings:

  - A unique constraint covering the columns `[cart_id,product_id]` on the table `cart_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `delivery_address` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delivery_latitude` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delivery_longitude` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_address_id_fkey";

-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivery_address" TEXT NOT NULL,
ADD COLUMN     "delivery_latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "delivery_longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "address_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_key" ON "cart_items"("cart_id", "product_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
