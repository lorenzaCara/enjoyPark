-- CreateTable
CREATE TABLE `TicketAttraction` (
    `ticketId` INTEGER NOT NULL,
    `attractionId` INTEGER NOT NULL,

    PRIMARY KEY (`ticketId`, `attractionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketShow` (
    `ticketId` INTEGER NOT NULL,
    `showId` INTEGER NOT NULL,

    PRIMARY KEY (`ticketId`, `showId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketService` (
    `ticketId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,

    PRIMARY KEY (`ticketId`, `serviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TicketAttraction` ADD CONSTRAINT `TicketAttraction_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketAttraction` ADD CONSTRAINT `TicketAttraction_attractionId_fkey` FOREIGN KEY (`attractionId`) REFERENCES `Attraction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketShow` ADD CONSTRAINT `TicketShow_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketShow` ADD CONSTRAINT `TicketShow_showId_fkey` FOREIGN KEY (`showId`) REFERENCES `Show`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketService` ADD CONSTRAINT `TicketService_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketService` ADD CONSTRAINT `TicketService_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
