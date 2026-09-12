-- Enrich character presentation, lore tracking and the public-facing story page.
ALTER TABLE "projects"
ADD COLUMN "page_title" TEXT,
ADD COLUMN "page_subtitle" TEXT,
ADD COLUMN "page_background_url" TEXT,
ADD COLUMN "page_background_color" TEXT NOT NULL DEFAULT '#09090b',
ADD COLUMN "page_text_color" TEXT NOT NULL DEFAULT '#fafafa',
ADD COLUMN "page_accent_color" TEXT NOT NULL DEFAULT '#f59e0b',
ADD COLUMN "page_theme" TEXT NOT NULL DEFAULT 'editorial',
ADD COLUMN "page_published" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "characters"
ADD COLUMN "name_color" TEXT NOT NULL DEFAULT '#f59e0b';

ALTER TABLE "lore_entries"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'planned',
ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "character_images" (
  "id" UUID NOT NULL,
  "character_id" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "emotion" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "character_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "character_images_character_id_order_idx"
ON "character_images"("character_id", "order");

ALTER TABLE "character_images"
ADD CONSTRAINT "character_images_character_id_fkey"
FOREIGN KEY ("character_id") REFERENCES "characters"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
