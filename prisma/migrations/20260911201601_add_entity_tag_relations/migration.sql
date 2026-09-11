-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "type" TEXT NOT NULL DEFAULT 'story',
    "status" TEXT NOT NULL DEFAULT 'idea',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_genres" (
    "id" UUID NOT NULL,
    "project_id" TEXT NOT NULL,
    "genre" TEXT NOT NULL,

    CONSTRAINT "project_genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "narrative_nodes" (
    "id" UUID NOT NULL,
    "project_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "narrative_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" UUID NOT NULL,
    "project_id" TEXT NOT NULL,
    "node_id" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "order" INTEGER NOT NULL DEFAULT 0,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "location_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_characters" (
    "id" UUID NOT NULL,
    "scene_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,

    CONSTRAINT "scene_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_blocks" (
    "id" UUID NOT NULL,
    "scene_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "character_id" TEXT,
    "emotion" TEXT,
    "position" TEXT,
    "speaker_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" UUID NOT NULL,
    "project_id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "alias" TEXT,
    "portrait_url" TEXT,
    "role" TEXT,
    "description" TEXT,
    "biography" TEXT,
    "age" TEXT,
    "birth_date" TEXT,
    "status" TEXT DEFAULT 'active',
    "personality" TEXT,
    "motivations" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "notes" TEXT,
    "important_quotes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_relations" (
    "id" UUID NOT NULL,
    "from_character_id" TEXT NOT NULL,
    "to_character_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "bidirectional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "character_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "project_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "textual_location" TEXT,
    "ambiance" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "type" TEXT,
    "status" TEXT DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "role" TEXT,
    "rank" TEXT,
    "description" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_relations" (
    "id" UUID NOT NULL,
    "from_org_id" TEXT NOT NULL,
    "to_org_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lore_entries" (
    "id" UUID NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "lore_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lore_links" (
    "id" UUID NOT NULL,
    "from_lore_id" TEXT NOT NULL,
    "to_lore_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'related',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lore_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_events" (
    "id" UUID NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "narrative_date" TEXT,
    "sort_key" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "location_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_event_characters" (
    "id" UUID NOT NULL,
    "timeline_event_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "timeline_event_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "project_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "category" TEXT,
    "description" TEXT,
    "alt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "entity_type" TEXT,
    "entity_id" TEXT,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_tags" (
    "id" UUID NOT NULL,
    "tag_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "project_id" TEXT,
    "scene_id" TEXT,
    "character_id" TEXT,
    "location_id" TEXT,
    "organization_id" TEXT,
    "lore_entry_id" TEXT,
    "media_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TimelineScenes" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "_TimelineOrgs" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_owner_id_idx" ON "projects"("owner_id");

-- CreateIndex
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_genres_project_id_genre_key" ON "project_genres"("project_id", "genre");

-- CreateIndex
CREATE INDEX "narrative_nodes_project_id_idx" ON "narrative_nodes"("project_id");

-- CreateIndex
CREATE INDEX "narrative_nodes_parent_id_idx" ON "narrative_nodes"("parent_id");

-- CreateIndex
CREATE INDEX "narrative_nodes_project_id_parent_id_order_idx" ON "narrative_nodes"("project_id", "parent_id", "order");

-- CreateIndex
CREATE INDEX "scenes_project_id_idx" ON "scenes"("project_id");

-- CreateIndex
CREATE INDEX "scenes_node_id_idx" ON "scenes"("node_id");

-- CreateIndex
CREATE INDEX "scenes_project_id_node_id_order_idx" ON "scenes"("project_id", "node_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "scene_characters_scene_id_character_id_key" ON "scene_characters"("scene_id", "character_id");

-- CreateIndex
CREATE INDEX "scene_blocks_scene_id_order_idx" ON "scene_blocks"("scene_id", "order");

-- CreateIndex
CREATE INDEX "characters_project_id_idx" ON "characters"("project_id");

-- CreateIndex
CREATE INDEX "characters_deleted_at_idx" ON "characters"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "character_relations_from_character_id_to_character_id_type_key" ON "character_relations"("from_character_id", "to_character_id", "type");

-- CreateIndex
CREATE INDEX "locations_project_id_idx" ON "locations"("project_id");

-- CreateIndex
CREATE INDEX "locations_parent_id_idx" ON "locations"("parent_id");

-- CreateIndex
CREATE INDEX "locations_deleted_at_idx" ON "locations"("deleted_at");

-- CreateIndex
CREATE INDEX "organizations_project_id_idx" ON "organizations"("project_id");

-- CreateIndex
CREATE INDEX "organizations_deleted_at_idx" ON "organizations"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_character_id_key" ON "organization_members"("organization_id", "character_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_relations_from_org_id_to_org_id_type_key" ON "organization_relations"("from_org_id", "to_org_id", "type");

-- CreateIndex
CREATE INDEX "lore_entries_project_id_idx" ON "lore_entries"("project_id");

-- CreateIndex
CREATE INDEX "lore_entries_project_id_category_idx" ON "lore_entries"("project_id", "category");

-- CreateIndex
CREATE INDEX "lore_entries_deleted_at_idx" ON "lore_entries"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "lore_links_from_lore_id_to_lore_id_key" ON "lore_links"("from_lore_id", "to_lore_id");

-- CreateIndex
CREATE INDEX "timeline_events_project_id_idx" ON "timeline_events"("project_id");

-- CreateIndex
CREATE INDEX "timeline_events_project_id_sort_key_idx" ON "timeline_events"("project_id", "sort_key");

-- CreateIndex
CREATE INDEX "timeline_events_deleted_at_idx" ON "timeline_events"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "timeline_event_characters_timeline_event_id_character_id_key" ON "timeline_event_characters"("timeline_event_id", "character_id");

-- CreateIndex
CREATE INDEX "media_project_id_idx" ON "media"("project_id");

-- CreateIndex
CREATE INDEX "media_entity_type_entity_id_idx" ON "media"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "media_deleted_at_idx" ON "media"("deleted_at");

-- CreateIndex
CREATE INDEX "tags_project_id_idx" ON "tags"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_project_id_name_key" ON "tags"("project_id", "name");

-- CreateIndex
CREATE INDEX "entity_tags_entity_type_entity_id_idx" ON "entity_tags"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_tags_tag_id_entity_type_entity_id_key" ON "entity_tags"("tag_id", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "_TimelineScenes_AB_unique" ON "_TimelineScenes"("A", "B");

-- CreateIndex
CREATE INDEX "_TimelineScenes_B_index" ON "_TimelineScenes"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_TimelineOrgs_AB_unique" ON "_TimelineOrgs"("A", "B");

-- CreateIndex
CREATE INDEX "_TimelineOrgs_B_index" ON "_TimelineOrgs"("B");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_genres" ADD CONSTRAINT "project_genres_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "narrative_nodes" ADD CONSTRAINT "narrative_nodes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "narrative_nodes" ADD CONSTRAINT "narrative_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "narrative_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "narrative_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_blocks" ADD CONSTRAINT "scene_blocks_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_blocks" ADD CONSTRAINT "scene_blocks_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_relations" ADD CONSTRAINT "character_relations_from_character_id_fkey" FOREIGN KEY ("from_character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_relations" ADD CONSTRAINT "character_relations_to_character_id_fkey" FOREIGN KEY ("to_character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_relations" ADD CONSTRAINT "organization_relations_from_org_id_fkey" FOREIGN KEY ("from_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_relations" ADD CONSTRAINT "organization_relations_to_org_id_fkey" FOREIGN KEY ("to_org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lore_entries" ADD CONSTRAINT "lore_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lore_links" ADD CONSTRAINT "lore_links_from_lore_id_fkey" FOREIGN KEY ("from_lore_id") REFERENCES "lore_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lore_links" ADD CONSTRAINT "lore_links_to_lore_id_fkey" FOREIGN KEY ("to_lore_id") REFERENCES "lore_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_event_characters" ADD CONSTRAINT "timeline_event_characters_timeline_event_id_fkey" FOREIGN KEY ("timeline_event_id") REFERENCES "timeline_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_event_characters" ADD CONSTRAINT "timeline_event_characters_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_lore_entry_id_fkey" FOREIGN KEY ("lore_entry_id") REFERENCES "lore_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_tags" ADD CONSTRAINT "entity_tags_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TimelineScenes" ADD CONSTRAINT "_TimelineScenes_A_fkey" FOREIGN KEY ("A") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TimelineScenes" ADD CONSTRAINT "_TimelineScenes_B_fkey" FOREIGN KEY ("B") REFERENCES "timeline_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TimelineOrgs" ADD CONSTRAINT "_TimelineOrgs_A_fkey" FOREIGN KEY ("A") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TimelineOrgs" ADD CONSTRAINT "_TimelineOrgs_B_fkey" FOREIGN KEY ("B") REFERENCES "timeline_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
