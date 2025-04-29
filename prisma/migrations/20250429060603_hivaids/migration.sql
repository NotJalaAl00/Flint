/*
  Warnings:

  - You are about to drop the column `paymentId` on the `order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[successfulPaymentId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amount` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `Payment_orderId_fkey`;

-- DropIndex
DROP INDEX `Order_paymentId_key` ON `order`;

-- AlterTable
ALTER TABLE `order` DROP COLUMN `paymentId`,
    ADD COLUMN `successfulPaymentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `amount` DOUBLE NOT NULL,
    ADD COLUMN `currency` VARCHAR(191) NOT NULL,
    ADD COLUMN `failedForOrderId` VARCHAR(191) NULL,
    MODIFY `orderId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Order_successfulPaymentId_key` ON `Order`(`successfulPaymentId`);

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_failedForOrderId_fkey` FOREIGN KEY (`failedForOrderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
