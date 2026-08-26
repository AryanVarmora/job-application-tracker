-- CreateEnum
CREATE TYPE "OutreachPlatform" AS ENUM ('linkedin', 'email', 'other');

-- CreateTable
CREATE TABLE "outreach_contacts" (
    "id" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "company" TEXT,
    "platform" "OutreachPlatform" NOT NULL,
    "messagedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "linkedApplicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "outreach_contacts" ADD CONSTRAINT "outreach_contacts_linkedApplicationId_fkey" FOREIGN KEY ("linkedApplicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
