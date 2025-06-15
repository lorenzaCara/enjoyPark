/*
  Warnings:

  - You are about to alter the column `paymentMethod` on the `ticket` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(1))`.

*/
-- AlterTable
ALTER TABLE `ticket` MODIFY `paymentMethod` ENUM('PAYPAL', 'CREDIT_CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'CASH') NULL;
