import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/database/prisma.service';

describe('TastyBoard API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = Date.now();
  const firstEmail = `e2e-${suffix}@example.com`;
  const secondEmail = `e2e-2-${suffix}@example.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [firstEmail, secondEmail] } },
    });
    await app.close();
  });

  it('valida health, JWT, CRUD e autorização por proprietário', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
      });

    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Usuário E2E',
        email: firstEmail,
        password: 'senha-segura-123',
      })
      .expect(201);

    expect(registration.body.accessToken).toEqual(expect.any(String));
    expect(registration.body.user.passwordHash).toBeUndefined();
    const token = registration.body.accessToken as string;
    const userId = registration.body.user.id as string;

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    expect(stored.passwordHash).not.toBe('senha-segura-123');

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: firstEmail, password: 'senha-incorreta' })
      .expect(401);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const created = await request(app.getHttpServer())
      .post('/recipes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Receita E2E',
        description: 'Receita criada no teste de integração.',
      })
      .expect(201);

    const recipeId = created.body.id as number;
    expect(created.body.authorId).toBe(userId);

    await request(app.getHttpServer())
      .patch(`/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Receita E2E atualizada' })
      .expect(200)
      .expect(({ body }) => expect(body.title).toBe('Receita E2E atualizada'));

    const secondRegistration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Segundo Usuário',
        email: secondEmail,
        password: 'senha-segura-456',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${secondRegistration.body.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
