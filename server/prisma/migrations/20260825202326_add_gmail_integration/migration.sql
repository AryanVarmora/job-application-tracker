-- CreateEnum
CREATE TYPE "EmailConfidence" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "google_auth_tokens" (
    "id" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmail_scan_state" (
    "id" TEXT NOT NULL,
    "lastScannedAt" TIMESTAMP(3),

    CONSTRAINT "gmail_scan_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmail_processed_messages" (
    "id" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gmail_processed_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmail_suggestions" (
    "id" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "suggestedStatus" "ApplicationStatus" NOT NULL,
    "confidence" "EmailConfidence" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gmail_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gmail_processed_messages_gmailMessageId_key" ON "gmail_processed_messages"("gmailMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "gmail_suggestions_gmailMessageId_key" ON "gmail_suggestions"("gmailMessageId");

-- AddForeignKey
ALTER TABLE "gmail_suggestions" ADD CONSTRAINT "gmail_suggestions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
