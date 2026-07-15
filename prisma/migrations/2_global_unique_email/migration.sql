DROP INDEX IF EXISTS "User_institutionId_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
