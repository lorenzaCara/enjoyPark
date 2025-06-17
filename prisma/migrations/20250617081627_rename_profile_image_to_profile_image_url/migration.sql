/*
  Warnings:

  - You are about to drop the column `profileImage` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `profileImage`,
    ADD COLUMN `profileImageUrl` VARCHAR(191) NULL;
