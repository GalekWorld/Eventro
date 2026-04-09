/*
  Warnings:

  - The values [LOCAL,RRPP] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `address` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `coverImageUrl` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `eventType` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `localProfileId` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `priceFrom` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `pricingMode` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `zone` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `LocalProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SavedEvent` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `city` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VenueRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('USER', 'VENUE_PENDING', 'VENUE', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_localProfileId_fkey";

-- DropForeignKey
ALTER TABLE "LocalProfile" DROP CONSTRAINT "LocalProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_eventId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "SavedEvent" DROP CONSTRAINT "SavedEvent_eventId_fkey";

-- DropForeignKey
ALTER TABLE "SavedEvent" DROP CONSTRAINT "SavedEvent_userId_fkey";

-- DropIndex
DROP INDEX "Event_eventType_idx";

-- DropIndex
DROP INDEX "Event_published_idx";

-- DropIndex
DROP INDEX "Event_slug_key";

-- DropIndex
DROP INDEX "Event_zone_startsAt_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "address",
DROP COLUMN "capacity",
DROP COLUMN "coverImageUrl",
DROP COLUMN "endsAt",
DROP COLUMN "eventType",
DROP COLUMN "localProfileId",
DROP COLUMN "priceFrom",
DROP COLUMN "pricingMode",
DROP COLUMN "slug",
DROP COLUMN "startsAt",
DROP COLUMN "zone",
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "price" DECIMAL(10,2),
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatarUrl",
DROP COLUMN "displayName",
ADD COLUMN     "name" TEXT;

-- DropTable
DROP TABLE "LocalProfile";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "SavedEvent";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "PricingMode";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "category" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "status" "VenueRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VenueRequest_userId_key" ON "VenueRequest"("userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueRequest" ADD CONSTRAINT "VenueRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
