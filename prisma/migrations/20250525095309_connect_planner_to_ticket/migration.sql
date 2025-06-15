/*
  Warnings:

  - You are about to drop the column `ticketTypeId` on the `planner` table. All the data in the column will be lost.
  - Added the required column `ticketId` to the `Planner` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `planner` DROP FOREIGN KEY `Planner_ticketTypeId_fkey`;

-- DropIndex
DROP INDEX `Planner_ticketTypeId_fkey` ON `planner`;

-- AlterTable
ALTER TABLE `planner` DROP COLUMN `ticketTypeId`,
    ADD COLUMN `ticketId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Planner` ADD CONSTRAINT `Planner_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
