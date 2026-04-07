const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/db');

describe('Auth Integration', () => {
  test('deve retornar erro ao logar com dados inválidos', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalido@test.com',
        password: 'Teste@123'
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  test('deve registrar usuário', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Teste',
        email: `teste${Date.now()}@test.com`,
        password: 'Teste@123'
      });

    console.log('REGISTER STATUS:', res.statusCode);
    console.log('REGISTER BODY:', res.body);

    expect([200, 201]).toContain(res.statusCode);
  });
});

// 🔥 FECHA O POOL
afterAll(async () => {
  await pool.end();
});