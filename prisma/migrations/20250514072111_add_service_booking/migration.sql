-- AlterTable
ALTER TABLE `service` ADD COLUMN `requiresBooking` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `ServiceBooking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plannerId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `bookingTime` DATETIME(3) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServiceBooking` ADD CONSTRAINT `ServiceBooking_plannerId_fkey` FOREIGN KEY (`plannerId`) REFERENCES `Planner`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceBooking` ADD CONSTRAINT `ServiceBooking_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
