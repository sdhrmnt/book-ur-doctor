const request = require('supertest');
const app = require('../../app');
const { User } = require('../../models');

describe('POST /api/auth/register - email duplikat', () => {
  it('membalas 409 dengan message "Email sudah terdaftar" (bukan pesan jadwal)', async () => {
    await User.create({
      email: 'dupe@mail.com',
      password: 'rahasia123',
      role: 'patient',
      name: 'Pasien Pertama',
    });

    const response = await request(app).post('/api/auth/register').send({
      email: 'dupe@mail.com',
      password: 'rahasia456',
      name: 'Pasien Kedua',
      role: 'patient',
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('Email sudah terdaftar');
  });
});
