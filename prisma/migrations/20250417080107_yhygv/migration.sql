/*
  Warnings:

  - You are about to drop the column `storeListId` on the `store` table. All the data in the column will be lost.
  - You are about to drop the `storelist` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ownerId]` on the table `Store` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `store` DROP FOREIGN KEY `Store_storeListId_fkey`;

-- DropForeignKey
ALTER TABLE `storelist` DROP FOREIGN KEY `StoreList_ownerId_fkey`;

-- DropIndex
DROP INDEX `Store_storeListId_key` ON `store`;

-- AlterTable
ALTER TABLE `store` DROP COLUMN `storeListId`,
    ADD COLUMN `ownerId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `storelist`;

-- CreateIndex
CREATE UNIQUE INDEX `Store_ownerId_key` ON `Store`(`ownerId`);

-- AddForeignKey
ALTER TABLE `Store` ADD CONSTRAINT `Store_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
