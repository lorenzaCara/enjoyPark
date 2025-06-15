/*
  Warnings:

  - A unique constraint covering the columns `[rawCode]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rawCode` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ticket` ADD COLUMN `rawCode` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Ticket_rawCode_key` ON `Ticket`(`rawCode`);
