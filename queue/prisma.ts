import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/client.js";

export default new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.POSTGRES_URL,
  }),
});
