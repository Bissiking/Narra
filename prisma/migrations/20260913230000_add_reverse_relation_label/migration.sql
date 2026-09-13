-- Each side of a character relation can use its own point-of-view label.
ALTER TABLE "character_relations" ADD COLUMN "reverse_label" TEXT;
