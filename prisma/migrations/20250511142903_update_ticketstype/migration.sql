/*
  Warnings:

  - You are about to drop the `notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `preference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ticketattraction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ticketservice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ticketshow` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `notification` DROP FOREIGN KEY `Notification_userId_fkey`;

-- DropForeignKey
ALTER TABLE `preference` DROP FOREIGN KEY `Preference_attractionId_fkey`;

-- DropForeignKey
ALTER TABLE `preference` DROP FOREIGN KEY `Preference_userId_fkey`;

-- DropForeignKey
ALTER TABLE `ticketattraction` DROP FOREIGN KEY `TicketAttraction_attractionId_fkey`;

-- DropForeignKey
ALTER TABLE `ticketattraction` DROP FOREIGN KEY `TicketAttraction_ticketId_fkey`;

-- DropForeignKey
ALTER TABLE `ticketservice` DROP FOREIGN KEY `TicketService_serviceId_fkey`;

-- DropForeignKey
ALTER TABLE `ticketservice` DROP FOREIGN KEY `TicketService_ticketId_fkey`;

-- DropForeignKey
ALTER TABLE `ticketshow` DROP FOREIGN KEY `TicketShow_showId_fkey`;

-- DropForeignKey
ALTER TABLE `ticketshow` DROP FOREIGN KEY `TicketShow_ticketId_fkey`;

-- DropTable
DROP TABLE `notification`;

-- DropTable
DROP TABLE `preference`;

-- DropTable
DROP TABLE `ticketattraction`;

-- DropTable
DROP TABLE `ticketservice`;

-- DropTable
DROP TABLE `ticketshow`;

-- CreateTable
CREATE TABLE `TicketTypeAttraction` (
    `ticketTypeId` INTEGER NOT NULL,
    `attractionId` INTEGER NOT NULL,

    PRIMARY KEY (`ticketTypeId`, `attractionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketTypeShow` (
    `ticketTypeId` INTEGER NOT NULL,
    `showId` INTEGER NOT NULL,

    PRIMARY KEY (`ticketTypeId`, `showId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketTypeService` (
    `ticketTypeId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,

    PRIMARY KEY (`ticketTypeId`, `serviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PlannerServices` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_PlannerServices_AB_unique`(`A`, `B`),
    INDEX `_PlannerServices_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TicketTypeAttraction` ADD CONSTRAINT `TicketTypeAttraction_ticketTypeId_fkey` FOREIGN KEY (`ticketTypeId`) REFERENCES `TicketType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketTypeAttraction` ADD CONSTRAINT `TicketTypeAttraction_attractionId_fkey` FOREIGN KEY (`attractionId`) REFERENCES `Attraction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketTypeShow` ADD CONSTRAINT `TicketTypeShow_ticketTypeId_fkey` FOREIGN KEY (`ticketTypeId`) REFERENCES `TicketType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketTypeShow` ADD CONSTRAINT `TicketTypeShow_showId_fkey` FOREIGN KEY (`showId`) REFERENCES `Show`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketTypeService` ADD CONSTRAINT `TicketTypeService_ticketTypeId_fkey` FOREIGN KEY (`ticketTypeId`) REFERENCES `TicketType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketTypeService` ADD CONSTRAINT `TicketTypeService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PlannerServices` ADD CONSTRAINT `_PlannerServices_A_fkey` FOREIGN KEY (`A`) REFERENCES `Planner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PlannerServices` ADD CONSTRAINT `_PlannerServices_B_fkey` FOREIGN KEY (`B`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
