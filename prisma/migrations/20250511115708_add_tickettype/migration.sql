/*
  Warnings:

  - You are about to drop the column `description` on the `ticket` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `ticket` table. All the data in the column will be lost.
  - Added the required column `ticketTypeId` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ticket` DROP COLUMN `description`,
    DROP COLUMN `name`,
    ADD COLUMN `ticketTypeId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `TicketType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,

    UNIQUE INDEX `TicketType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_ticketTypeId_fkey` FOREIGN KEY (`ticketTypeId`) REFERENCES `TicketType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
