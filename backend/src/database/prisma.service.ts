import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { env } from '../config/env';

function buildConnectionString(): string {
  const url = new URL(env.DATABASE_URL);
  // `pg` overrides any explicit `ssl` option with what it parses from
  // `sslmode` in the connection string, so it must be stripped here for
  // the explicit `ssl: { rejectUnauthorized: false }` below to take effect
  // (needed because Supabase's pooler presents a cert chain Node rejects).
  url.searchParams.delete('sslmode');
  return url.toString();
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: buildConnectionString(),
      max: env.NODE_ENV === 'production' ? 1 : 10,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    super({ adapter });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
