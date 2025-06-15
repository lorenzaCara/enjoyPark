-- AlterTable
ALTER TABLE `notification` ADD COLUMN `serviceBookingId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_serviceBookingId_fkey` FOREIGN KEY (`serviceBookingId`) REFERENCES `ServiceBooking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
