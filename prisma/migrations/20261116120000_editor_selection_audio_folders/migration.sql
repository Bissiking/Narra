ALTER TABLE "scene_blocks" ADD COLUMN "audio_start_block_id" TEXT, ADD COLUMN "audio_group_id" TEXT;
CREATE TABLE "media_folders" (
 "id" UUID NOT NULL, "project_id" UUID NOT NULL, "parent_id" UUID,
 "name" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "media_folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
 CONSTRAINT "media_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "media_folders"("id") ON DELETE RESTRICT
);
CREATE INDEX "media_folders_project_id_parent_id_idx" ON "media_folders"("project_id", "parent_id");
CREATE UNIQUE INDEX "media_folders_unique_name" ON "media_folders"("project_id", COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'::uuid), lower("name"));
ALTER TABLE "media" ADD COLUMN "folder_id" UUID;
ALTER TABLE "media" ADD CONSTRAINT "media_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "media_folders"("id") ON DELETE SET NULL;
