/*
  Warnings:

  - You are about to drop the column `numberOfPeople` on the `service` table. All the data in the column will be lost.
  - You are about to drop the column `specialRequests` on the `service` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `service` DROP COLUMN `numberOfPeople`,
    DROP COLUMN `specialRequests`;

-- AlterTable
ALTER TABLE `servicebooking` ADD COLUMN `numberOfPeople` INTEGER NULL,
    ADD COLUMN `specialRequests` VARCHAR(191) NULL;
