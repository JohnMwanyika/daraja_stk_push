/*
  Warnings:

  - You are about to alter the column `number` on the `payment` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - Changed the type of `amount` on the `payment` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE `payment` MODIFY `number` INTEGER NOT NULL,
    DROP COLUMN `amount`,
    ADD COLUMN `amount` DECIMAL(15, 2) NOT NULL;
