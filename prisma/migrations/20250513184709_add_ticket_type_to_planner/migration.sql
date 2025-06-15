/*
  Warnings:

  - Added the required column `ticketTypeId` to the `Planner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `planner` ADD COLUMN `ticketTypeId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Planner` ADD CONSTRAINT `Planner_ticketTypeId_fkey` FOREIGN KEY (`ticketTypeId`) REFERENCES `TicketType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
