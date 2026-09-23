const request = require('supertest');
const app = require('../../app');
const { User, PatientProfile } = require('../../models');

describe('POST /api/auth/register', () => {
  it('E1 - register pasien: User + PatientProfile dibuat, password ter-hash, tidak muncul di response', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'rina@mail.com',
      password: 'rahasia123',
      name: 'Rina',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).not.toHaveProperty('password');

    const user = await User.findOne({ where: { email: 'rina@mail.com' } });
    expect(user).not.toBeNull();
    expect(user.role).toBe('patient');
    expect(user.password).not.toBe('rahasia123');

    const patientProfile = await PatientProfile.findOne({ where: { UserId: user.id } });
    expect(patientProfile).not.toBeNull();
    expect(patientProfile.UserId).toBe(user.id);
    expect(patientProfile.dateOfBirth).toBeNull();
    expect(patientProfile.gender).toBeNull();
  });

  it('E2 - register dengan role "doctor" ditolak 400, tidak ada user dibuat', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'dr.palsu@mail.com',
      password: 'rahasia123',
      name: 'dr. Palsu',
      role: 'doctor',
    });

    expect(response.status).toBe(400);

    const user = await User.findOne({ where: { email: 'dr.palsu@mail.com' } });
    expect(user).toBeNull();
  });
});
