/*
  Warnings:

  - Made the column `ownerId` on table `store` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `store` DROP FOREIGN KEY `Store_ownerId_fkey`;

-- AlterTable
ALTER TABLE `store` MODIFY `ownerId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Store` ADD CONSTRAINT `Store_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
