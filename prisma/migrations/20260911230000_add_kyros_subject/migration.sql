-- Keep the immutable Kyros subject separate from mutable profile fields such as email.
ALTER TABLE "users" ADD COLUMN "kyros_sub" TEXT;

CREATE UNIQUE INDEX "users_kyros_sub_key" ON "users"("kyros_sub");
