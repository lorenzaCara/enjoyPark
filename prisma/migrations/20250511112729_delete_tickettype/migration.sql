/*
  Warnings:

  - You are about to drop the column `ticketTypeId` on the `ticket` table. All the data in the column will be lost.
  - You are about to drop the `_tickettypeattractions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_tickettypeservices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_tickettypeshows` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tickettype` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_tickettypeattractions` DROP FOREIGN KEY `_TicketTypeAttractions_A_fkey`;

-- DropForeignKey
ALTER TABLE `_tickettypeattractions` DROP FOREIGN KEY `_TicketTypeAttractions_B_fkey`;

-- DropForeignKey
ALTER TABLE `_tickettypeservices` DROP FOREIGN KEY `_TicketTypeServices_A_fkey`;

-- DropForeignKey
ALTER TABLE `_tickettypeservices` DROP FOREIGN KEY `_TicketTypeServices_B_fkey`;

-- DropForeignKey
ALTER TABLE `_tickettypeshows` DROP FOREIGN KEY `_TicketTypeShows_A_fkey`;

-- DropForeignKey
ALTER TABLE `_tickettypeshows` DROP FOREIGN KEY `_TicketTypeShows_B_fkey`;

-- DropForeignKey
ALTER TABLE `ticket` DROP FOREIGN KEY `Ticket_ticketTypeId_fkey`;

-- DropIndex
DROP INDEX `Ticket_ticketTypeId_fkey` ON `ticket`;

-- AlterTable
ALTER TABLE `ticket` DROP COLUMN `ticketTypeId`,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `name` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `_tickettypeattractions`;

-- DropTable
DROP TABLE `_tickettypeservices`;

-- DropTable
DROP TABLE `_tickettypeshows`;

-- DropTable
DROP TABLE `tickettype`;
