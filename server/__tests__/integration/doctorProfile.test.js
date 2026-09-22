const { Sequelize, User, Specialization, DoctorProfile } = require('../../models');

async function createDoctorUser(email) {
  return User.create({
    email,
    password: 'rahasia123',
    role: 'doctor',
    name: 'dr. Adi',
  });
}

describe('DoctorProfile constraints', () => {
  let specialization;

  beforeEach(async () => {
    specialization = await Specialization.create({ name: 'Kardiologi', slug: 'kardiologi' });
  });

  it('menolak dua DoctorProfile dengan UserId yang sama', async () => {
    const user = await createDoctorUser('dr.satu@mail.com');
    await DoctorProfile.create({
      UserId: user.id,
      SpecializationId: specialization.id,
      licenseNumber: 'STR-001',
      experienceYears: 5,
      consultationFee: 150000,
    });

    await expect(
      DoctorProfile.create({
        UserId: user.id,
        SpecializationId: specialization.id,
        licenseNumber: 'STR-002',
        experienceYears: 3,
        consultationFee: 100000,
      })
    ).rejects.toThrow(Sequelize.UniqueConstraintError);
  });

  it('menolak DoctorProfile dengan UserId yang tidak ada di Users', async () => {
    await expect(
      DoctorProfile.create({
        UserId: 999999,
        SpecializationId: specialization.id,
        licenseNumber: 'STR-003',
        experienceYears: 2,
        consultationFee: 100000,
      })
    ).rejects.toThrow(Sequelize.ForeignKeyConstraintError);
  });

  it('menyimpan experienceYears (bukan experienceYear) dan languages sebagai array', async () => {
    const user = await createDoctorUser('dr.dua@mail.com');
    const created = await DoctorProfile.create({
      UserId: user.id,
      SpecializationId: specialization.id,
      licenseNumber: 'STR-004',
      experienceYears: 7,
      consultationFee: 200000,
      languages: ['id', 'en'],
    });

    const reloaded = await DoctorProfile.findByPk(created.id);

    expect(reloaded.experienceYears).toBe(7);
    expect(reloaded.dataValues.experienceYear).toBeUndefined();
    expect(reloaded.languages).toEqual(['id', 'en']);
  });

  it('bisa eager-load Specialization lewat asosiasi (bukan User)', async () => {
    const user = await createDoctorUser('dr.tiga@mail.com');
    await DoctorProfile.create({
      UserId: user.id,
      SpecializationId: specialization.id,
      licenseNumber: 'STR-005',
      experienceYears: 4,
      consultationFee: 180000,
    });

    const found = await DoctorProfile.findOne({
      where: { UserId: user.id },
      include: [{ model: Specialization }],
    });

    expect(found.Specialization).toBeDefined();
    expect(found.Specialization.slug).toBe('kardiologi');
  });
});
