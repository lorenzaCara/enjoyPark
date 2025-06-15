/*
  Warnings:

  - The values [APPLE_PAY,GOOGLE_PAY,CASH] on the enum `Ticket_paymentMethod` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `ticket` MODIFY `paymentMethod` ENUM('PAYPAL', 'CREDIT_CARD') NULL;
