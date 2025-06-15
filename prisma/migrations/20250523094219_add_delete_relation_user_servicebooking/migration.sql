/*
  Warnings:

  - You are about to drop the column `userId` on the `servicebooking` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `servicebooking` DROP FOREIGN KEY `ServiceBooking_userId_fkey`;

-- DropIndex
DROP INDEX `ServiceBooking_userId_fkey` ON `servicebooking`;

-- AlterTable
ALTER TABLE `servicebooking` DROP COLUMN `userId`;
