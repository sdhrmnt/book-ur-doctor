const { Specialization, User, DoctorProfile, Clinic, Appointment } = require('../../models');

describe('E16 - Double booking konkuren', () => {
    it('dua request booking slot sama BERSAMAAN -> tepat 1 baris tersimpan, 1 gagal unique constraint', async () => {
        const spec = await Specialization.create({ name: 'Kardiologi', slug: `kardiologi-${Date.now()}` });
        const doctorUser = await User.create({
            email: `dokter${Date.now()}@test.com`, password: 'password123', name: 'Dr. Test', role: 'doctor',
        });
        const doctorProfile = await DoctorProfile.create({
            UserId: doctorUser.id, SpecializationId: spec.id,
            licenseNumber: `STR-${Date.now()}`, experienceYears: 5, consultationFee: 100000, languages: ['id'],
        });
        const clinic = await Clinic.create({ name: 'Klinik Test', address: 'Jl. Test', city: 'jakarta' });
        const patientA = await User.create({ email: `pasienA${Date.now()}@test.com`, password: 'password123', name: 'Pasien A', role: 'patient' });
        const patientB = await User.create({ email: `pasienB${Date.now()}@test.com`, password: 'password123', name: 'Pasien B', role: 'patient' });

        const slot = { startsAt: new Date('2026-10-01T02:00:00Z'), endsAt: new Date('2026-10-01T02:30:00Z') };

        // KUNCI: dua create ditembak BERSAMAAN (Promise.allSettled), bukan berurutan —
        // ini yang membuktikan constraint DB-nya (bukan cek aplikasi findOne-lalu-create)
        // yang mencegah race condition sungguhan.
        const results = await Promise.allSettled([
            Appointment.create({ PatientId: patientA.id, DoctorProfileId: doctorProfile.id, ClinicId: clinic.id, ...slot, feeSnapshot: 100000 }),
            Appointment.create({ PatientId: patientB.id, DoctorProfileId: doctorProfile.id, ClinicId: clinic.id, ...slot, feeSnapshot: 100000 }),
        ]);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(rejected[0].reason.name).toBe('SequelizeUniqueConstraintError');
        expect(rejected[0].reason.parent.constraint).toBe('appointments_no_double_booking');

        const count = await Appointment.count({ where: { DoctorProfileId: doctorProfile.id, ...slot } });
        expect(count).toBe(1); // tepat 1 baris tersimpan, bukan 0 atau 2
    });

    it('slot yang sama tapi appointment lama sudah cancelled -> boleh dipesan ulang', async () => {
        const spec = await Specialization.create({ name: 'Umum', slug: `umum-${Date.now()}` });
        const doctorUser = await User.create({ email: `d2${Date.now()}@test.com`, password: 'password123', name: 'Dr. B', role: 'doctor' });
        const doctorProfile = await DoctorProfile.create({
            UserId: doctorUser.id, SpecializationId: spec.id,
            licenseNumber: `STR2-${Date.now()}`, experienceYears: 3, consultationFee: 50000, languages: ['id'],
        });
        const clinic = await Clinic.create({ name: 'Klinik B', address: 'Jl. B', city: 'jakarta' });
        const patientA = await User.create({ email: `pA2${Date.now()}@test.com`, password: 'password123', name: 'A', role: 'patient' });
        const patientB = await User.create({ email: `pB2${Date.now()}@test.com`, password: 'password123', name: 'B', role: 'patient' });

        const slot = { startsAt: new Date('2026-11-01T02:00:00Z'), endsAt: new Date('2026-11-01T02:30:00Z') };

        const first = await Appointment.create({ PatientId: patientA.id, DoctorProfileId: doctorProfile.id, ClinicId: clinic.id, ...slot, feeSnapshot: 50000 });
        await first.update({ status: 'cancelled', cancelledAt: new Date() });

        // Partial index cuma mengunci status scheduled/confirmed — cancelled harus lolos.
        const second = await Appointment.create({ PatientId: patientB.id, DoctorProfileId: doctorProfile.id, ClinicId: clinic.id, ...slot, feeSnapshot: 50000 });
        expect(second.id).toBeDefined();
    });
});