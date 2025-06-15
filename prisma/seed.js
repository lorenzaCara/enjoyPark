import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Inizio seed...");

  const dataPath = path.join(__dirname, 'data');

  const attractions = JSON.parse(await fs.readFile(path.join(dataPath, 'attractions.json'), 'utf-8'));
  const shows = JSON.parse(await fs.readFile(path.join(dataPath, 'shows.json'), 'utf-8'));
  const services = JSON.parse(await fs.readFile(path.join(dataPath, 'services.json'), 'utf-8'));
  const ticketTypes = JSON.parse(await fs.readFile(path.join(dataPath, 'ticketTypes.json'), 'utf-8'));

  // Cancella dati precedenti in ordine corretto
  await prisma.notification.deleteMany();
  await prisma.serviceBooking.deleteMany();
  await prisma.planner.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.ticketTypeAttraction.deleteMany();
  await prisma.ticketTypeShow.deleteMany();
  await prisma.ticketTypeService.deleteMany();
  await prisma.waitTime.deleteMany();
  await prisma.attraction.deleteMany();
  await prisma.show.deleteMany();
  await prisma.service.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.user.deleteMany();

  console.log("📦 Dati precedenti rimossi.");

  // Creo attrazioni, spettacoli, servizi
  const createdAttractions = [];
  for (const attraction of attractions) {
    const created = await prisma.attraction.create({ data: attraction });
    createdAttractions.push(created);
  }

  const createdShows = [];
  for (const show of shows) {
    const created = await prisma.show.create({ data: show });
    createdShows.push(created);
  }

  const createdServices = [];
  for (const service of services) {
    const created = await prisma.service.create({ data: service });
    createdServices.push(created);
  }

  // Ora creo ticketType e relazioni usando direttamente gli ID dal JSON
  for (const type of ticketTypes) {
    const { attractions: attractionIds = [], shows: showIds = [], services: serviceIds = [], ...ticketTypeData } = type;

    // Creo ticketType
    const createdTicketType = await prisma.ticketType.create({
      data: ticketTypeData,
    });

    // Creo relazioni attrazioni
    await Promise.all(
      attractionIds.map(attractionId => prisma.ticketTypeAttraction.create({
        data: {
          ticketTypeId: createdTicketType.id,
          attractionId,
        },
      }))
    );

    // Creo relazioni spettacoli
    await Promise.all(
      showIds.map(showId => prisma.ticketTypeShow.create({
        data: {
          ticketTypeId: createdTicketType.id,
          showId,
        },
      }))
    );

    // Creo relazioni servizi
    await Promise.all(
      serviceIds.map(serviceId => prisma.ticketTypeService.create({
        data: {
          ticketTypeId: createdTicketType.id,
          serviceId,
        },
      }))
    );
  }

  console.log("✅ Seed completato con successo!");
}

main()
  .catch(e => {
    console.error("❌ Errore nel seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
