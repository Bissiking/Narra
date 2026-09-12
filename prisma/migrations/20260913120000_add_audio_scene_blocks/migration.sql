ALTER TABLE "scene_blocks"
ADD COLUMN "media_url" TEXT,
ADD COLUMN "audio_action" TEXT,
ADD COLUMN "volume" INTEGER DEFAULT 100,
ADD COLUMN "fade_duration" DOUBLE PRECISION,
ADD COLUMN "loop" BOOLEAN DEFAULT false;

ALTER TABLE "scene_blocks"
ADD CONSTRAINT "scene_blocks_volume_check"
CHECK ("volume" IS NULL OR ("volume" >= 0 AND "volume" <= 100));

ALTER TABLE "scene_blocks"
ADD CONSTRAINT "scene_blocks_fade_duration_check"
CHECK ("fade_duration" IS NULL OR ("fade_duration" >= 0 AND "fade_duration" <= 30));
