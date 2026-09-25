ALTER TABLE "scenes" ADD COLUMN "reader_title" TEXT;
ALTER TABLE "scenes" ADD COLUMN "show_reader_title" BOOLEAN NOT NULL DEFAULT false;
