-- CreateEnum
CREATE TYPE "GmailSuggestionType" AS ENUM ('status_update', 'new_application');

-- AlterTable
ALTER TABLE "gmail_suggestions" ADD COLUMN     "appliedDate" TIMESTAMP(3),
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "type" "GmailSuggestionType" NOT NULL DEFAULT 'status_update',
ALTER COLUMN "applicationId" DROP NOT NULL,
ALTER COLUMN "suggestedStatus" DROP NOT NULL;
