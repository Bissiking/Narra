import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@narra.app" },
    update: {},
    create: {
      email: "demo@narra.app",
      name: "Démo",
    },
  });

  console.log("Created user:", user.name);

  // Create a demo project
  const project = await prisma.project.upsert({
    where: { slug: "arc" },
    update: {},
    create: {
      name: "ARC",
      slug: "arc",
      description: "Projet narratif ARC - Série",
      type: "story",
      status: "writing",
      ownerId: user.id,
      genres: {
        create: [{ genre: "science-fiction" }, { genre: "action" }, { genre: "thriller" }],
      },
    },
  });

  console.log("Created project:", project.name);

  // Create narrative structure
  const saison1 = await prisma.narrativeNode.create({
    data: {
      projectId: project.id,
      type: "season",
      title: "Saison 1",
      order: 0,
      depth: 0,
    },
  });

  const episode1 = await prisma.narrativeNode.create({
    data: {
      projectId: project.id,
      parentId: saison1.id,
      type: "arc",
      title: "Épisode 1",
      order: 0,
      depth: 1,
    },
  });

  await prisma.narrativeNode.create({
    data: {
      projectId: project.id,
      parentId: episode1.id,
      type: "chapter",
      title: "B1 — La nomination",
      order: 0,
      depth: 2,
    },
  });

  console.log("Created narrative structure");

  // Create characters
  const soren = await prisma.character.create({
    data: {
      projectId: project.id,
      firstName: "Soren",
      lastName: "Moreno",
      alias: "Bravo-10",
      role: "protagonist",
      status: "active",
      description: "Chef de l'unité Bravo-10, ancien FSI.",
      age: "21 ans",
    },
  });

  const tao = await prisma.character.create({
    data: {
      projectId: project.id,
      firstName: "Tao",
      lastName: "Ricci",
      role: "supporting",
      status: "active",
      description: "Meilleur ami de Soren, ancien FSI.",
    },
  });

  const nora = await prisma.character.create({
    data: {
      projectId: project.id,
      firstName: "Nora",
      lastName: "Vales",
      role: "supporting",
      status: "active",
      description: "Compagne de Soren, known depuis l'enfance.",
    },
  });

  const maria = await prisma.character.create({
    data: {
      projectId: project.id,
      firstName: "Maria",
      lastName: "Moreno",
      role: "supporting",
      status: "active",
      description: "Mère de Soren, membre de l'ORI.",
    },
  });

  console.log("Created characters");

  // Create character relations
  await prisma.characterRelation.create({
    data: {
      fromCharacterId: soren.id,
      toCharacterId: tao.id,
      type: "friend",
      label: "Frères d'armes",
      bidirectional: true,
    },
  });

  await prisma.characterRelation.create({
    data: {
      fromCharacterId: soren.id,
      toCharacterId: nora.id,
      type: "couple",
      bidirectional: true,
    },
  });

  await prisma.characterRelation.create({
    data: {
      fromCharacterId: soren.id,
      toCharacterId: maria.id,
      type: "family",
      label: "Mère/Fils",
      bidirectional: true,
    },
  });

  console.log("Created character relations");

  // Create locations
  const ori = await prisma.location.create({
    data: {
      projectId: project.id,
      name: "ORI",
      type: "organization",
      description: "Quartier général de l'ORI",
    },
  });

  await prisma.location.create({
    data: {
      projectId: project.id,
      parentId: ori.id,
      name: "Bureau ARC",
      type: "room",
      description: "Bureau de l'unité Bravo-10",
    },
  });

  console.log("Created locations");

  // Create organizations
  const bravo10 = await prisma.organization.create({
    data: {
      projectId: project.id,
      name: "Bravo-10",
      type: "military",
      description: "Unité opérationnelle de l'ORI",
      status: "active",
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: bravo10.id,
      characterId: soren.id,
      role: "leader",
      rank: "Commandant",
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: bravo10.id,
      characterId: tao.id,
      role: "member",
    },
  });

  console.log("Created organizations");

  // Create lore entries
  await prisma.loreEntry.create({
    data: {
      projectId: project.id,
      title: "Les FSI",
      category: "organizations",
      content: "Les Forces Spéciales Interspatiales sont l'unité d'élite de l'ORI.",
    },
  });

  await prisma.loreEntry.create({
    data: {
      projectId: project.id,
      title: "La mission de Khepri",
      category: "events",
      content: "Mission FSI qui a marqué profondément Soren et Tao.",
    },
  });

  console.log("Created lore entries");

  // Create timeline events
  await prisma.timelineEvent.create({
    data: {
      projectId: project.id,
      title: "Nomination de Soren",
      narrativeDate: "2087",
      sortKey: "2087-001",
      order: 0,
    },
  });

  console.log("Created timeline events");

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
