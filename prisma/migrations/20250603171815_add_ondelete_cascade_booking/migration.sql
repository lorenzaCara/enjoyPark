-- DropForeignKey
ALTER TABLE `servicebooking` DROP FOREIGN KEY `ServiceBooking_plannerId_fkey`;

-- DropIndex
DROP INDEX `ServiceBooking_plannerId_fkey` ON `servicebooking`;

-- AddForeignKey
ALTER TABLE `ServiceBooking` ADD CONSTRAINT `ServiceBooking_plannerId_fkey` FOREIGN KEY (`plannerId`) REFERENCES `Planner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
