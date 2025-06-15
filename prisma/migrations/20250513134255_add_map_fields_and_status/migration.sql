/*
  Warnings:

  - You are about to alter the column `startTime` on the `show` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.
  - You are about to alter the column `endTime` on the `show` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.

*/
-- AlterTable
ALTER TABLE `attraction` ADD COLUMN `mapX` DOUBLE NULL,
    ADD COLUMN `mapY` DOUBLE NULL;

-- AlterTable
ALTER TABLE `service` ADD COLUMN `mapX` DOUBLE NULL,
    ADD COLUMN `mapY` DOUBLE NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'UNAVAILABLE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `show` ADD COLUMN `mapX` DOUBLE NULL,
    ADD COLUMN `mapY` DOUBLE NULL,
    ADD COLUMN `status` ENUM('SCHEDULED', 'ONGOING', 'CANCELLED', 'DELAYED', 'FINISHED') NOT NULL DEFAULT 'SCHEDULED',
    MODIFY `startTime` DATETIME(3) NOT NULL,
    MODIFY `endTime` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `WaitTime` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `attractionId` INTEGER NOT NULL,
    `time` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WaitTime` ADD CONSTRAINT `WaitTime_attractionId_fkey` FOREIGN KEY (`attractionId`) REFERENCES `Attraction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
