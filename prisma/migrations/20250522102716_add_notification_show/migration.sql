-- AlterTable
ALTER TABLE `notification` ADD COLUMN `showId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_showId_fkey` FOREIGN KEY (`showId`) REFERENCES `Show`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
