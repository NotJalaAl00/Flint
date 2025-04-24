/*
  Warnings:

  - You are about to drop the column `height` on the `photo` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `photo` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `user` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `photo` DROP FOREIGN KEY `Photo_storeId_fkey`;

ALTER TABLE `photo` DROP FOREIGN KEY `Photo_productId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `store` DROP FOREIGN KEY `Store_ownerId_fkey`;

-- DropIndex
DROP INDEX `Photo_storeId_key` ON `photo`;

-- DropIndex
DROP INDEX `Product_storeId_fkey` ON `product`;

-- DropIndex
DROP INDEX `Store_ownerId_key` ON `store`;

-- DropIndex
DROP INDEX `User_storeId_key` ON `user`;

-- AlterTable
ALTER TABLE `photo` DROP COLUMN `height`,
    DROP COLUMN `width`;

-- AlterTable
ALTER TABLE `product` MODIFY `storeId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `storeId`;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Photo` ADD CONSTRAINT `Photo_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
