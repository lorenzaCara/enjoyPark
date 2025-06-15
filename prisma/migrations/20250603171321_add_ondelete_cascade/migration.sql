-- DropForeignKey
ALTER TABLE `planner` DROP FOREIGN KEY `Planner_ticketId_fkey`;

-- DropIndex
DROP INDEX `Planner_ticketId_fkey` ON `planner`;

-- AddForeignKey
ALTER TABLE `Planner` ADD CONSTRAINT `Planner_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
