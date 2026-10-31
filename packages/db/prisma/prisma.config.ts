import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://takt:takt@localhost:5432/takt_dev',
  },
});