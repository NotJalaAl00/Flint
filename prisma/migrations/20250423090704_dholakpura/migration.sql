/*
  Warnings:

  - Added the required column `filename` to the `Photo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `photo` ADD COLUMN `filename` VARCHAR(191) NOT NULL;
