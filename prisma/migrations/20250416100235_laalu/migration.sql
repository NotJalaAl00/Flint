-- DropForeignKey
ALTER TABLE `store` DROP FOREIGN KEY `Store_storeListId_fkey`;

-- AlterTable
ALTER TABLE `store` MODIFY `storeListId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Store` ADD CONSTRAINT `Store_storeListId_fkey` FOREIGN KEY (`storeListId`) REFERENCES `StoreList`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
