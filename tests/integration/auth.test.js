const request = require('supertest');
const app = require('../../src/server');

describe('Auth Integration', () => {
  test('deve retornar erro ao logar com dados inválidos', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalido@test.com',
        password: '123456'
      });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  test('deve registrar usuário', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Teste',
        email: `teste${Date.now()}@test.com`,
        password: '123456'
      });

    expect([200, 201]).toContain(res.statusCode);
  });
});