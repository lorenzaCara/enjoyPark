/*
  Warnings:

  - Added the required column `userId` to the `ServiceBooking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `servicebooking` ADD COLUMN `userId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `ServiceBooking` ADD CONSTRAINT `ServiceBooking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
