/*
  Warnings:

  - Added the required column `sendAt` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `notification` ADD COLUMN `sendAt` DATETIME(3) NOT NULL,
    ADD COLUMN `sent` BOOLEAN NOT NULL DEFAULT false;
