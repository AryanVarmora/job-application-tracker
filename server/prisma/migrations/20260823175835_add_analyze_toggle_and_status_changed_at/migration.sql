-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "analyzeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "statusChangedAt" TIMESTAMP(3);
