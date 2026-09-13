ALTER TABLE "characters"
ADD COLUMN "wiki_sections" JSONB NOT NULL DEFAULT '[]'::jsonb;
