import { defineConfig } from 'prisma/config';
import { env } from 'process';

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL') ?? 'postgresql://takt:takt@localhost:5432/takt_dev',
  },
});