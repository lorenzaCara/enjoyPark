/*
  Warnings:

  - Added the required column `title` to the `Planner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `planner` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `title` VARCHAR(191) NOT NULL;
