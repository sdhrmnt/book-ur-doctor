const {
    Sequelize, User, Specialization, DoctorProfile, Clinic, DoctorSchedule, ScheduleException,
} = require('../../models');

async function createDoctorProfile(suffix) {
    const specialization = await Specialization.create({ name: 'Kardiologi', slug: `kardiologi-${suffix}` });
    const user = await User.create({
        email: `dokter${suffix}@test.com`, password: 'password123', name: 'Dr. Test', role: 'doctor',
    });
    return DoctorProfile.create({
        UserId: user.id,
        SpecializationId: specialization.id,
        licenseNumber: `STR-${suffix}`,
        experienceYears: 5,
        consultationFee: 100000,
        languages: ['id'],
    });
}

describe('DoctorSchedule constraints (ERD.md §3)', () => {
    let doctorProfile;
    let clinic;

    beforeEach(async () => {
        doctorProfile = await createDoctorProfile(Date.now());
        clinic = await Clinic.create({ name: 'Klinik Test', address: 'Jl. Test', city: 'jakarta' });
    });

    it('menolak dayOfWeek = 7 (CHECK dayOfWeek BETWEEN 0 AND 6)', async () => {
        await expect(
            DoctorSchedule.create({
                DoctorProfileId: doctorProfile.id,
                ClinicId: clinic.id,
                dayOfWeek: 7,
                startTime: '09:00',
                endTime: '12:00',
                slotDurationMinutes: 30,
                effectiveFrom: '2026-09-01',
            })
        ).rejects.toThrow(Sequelize.DatabaseError);
    });

    it('menolak startTime >= endTime (CHECK startTime < endTime)', async () => {
        await expect(
            DoctorSchedule.create({
                DoctorProfileId: doctorProfile.id,
                ClinicId: clinic.id,
                dayOfWeek: 6,
                startTime: '12:00',
                endTime: '09:00',
                slotDurationMinutes: 30,
                effectiveFrom: '2026-09-01',
            })
        ).rejects.toThrow(Sequelize.DatabaseError);
    });

    it('menolak slotDurationMinutes = 0 (CHECK slotDurationMinutes > 0)', async () => {
        await expect(
            DoctorSchedule.create({
                DoctorProfileId: doctorProfile.id,
                ClinicId: clinic.id,
                dayOfWeek: 6,
                startTime: '09:00',
                endTime: '12:00',
                slotDurationMinutes: 0,
                effectiveFrom: '2026-09-01',
            })
        ).rejects.toThrow(Sequelize.DatabaseError);
    });

    it('menyimpan DoctorSchedule yang valid (happy path)', async () => {
        const schedule = await DoctorSchedule.create({
            DoctorProfileId: doctorProfile.id,
            ClinicId: clinic.id,
            dayOfWeek: 6,
            startTime: '09:00',
            endTime: '12:00',
            slotDurationMinutes: 30,
            effectiveFrom: '2026-09-01',
        });

        expect(schedule.id).toBeDefined();
        expect(schedule.dayOfWeek).toBe(6);
    });
});

describe('ScheduleException constraints (ERD.md §3)', () => {
    let doctorProfile;
    let clinic;

    beforeEach(async () => {
        doctorProfile = await createDoctorProfile(`${Date.now()}-2`);
        clinic = await Clinic.create({ name: 'Klinik Test', address: 'Jl. Test', city: 'jakarta' });
    });

    it("menolak type 'extra' tanpa ClinicId", async () => {
        await expect(
            ScheduleException.create({
                DoctorProfileId: doctorProfile.id,
                ClinicId: null,
                date: '2026-09-05',
                type: 'extra',
                startTime: '13:00',
                endTime: '15:00',
            })
        ).rejects.toThrow(Sequelize.DatabaseError);
    });

    it("menolak type 'extra' tanpa startTime dan endTime", async () => {
        await expect(
            ScheduleException.create({
                DoctorProfileId: doctorProfile.id,
                ClinicId: clinic.id,
                date: '2026-09-05',
                type: 'extra',
                startTime: null,
                endTime: null,
            })
        ).rejects.toThrow(Sequelize.DatabaseError);
    });

    it('menolak dua ScheduleException dengan (DoctorProfileId, date, type, startTime) sama', async () => {
        await ScheduleException.create({
            DoctorProfileId: doctorProfile.id,
            ClinicId: clinic.id,
            date: '2026-09-05',
            type: 'extra',
            startTime: '13:00',
            endTime: '15:00',
        });

        await expect(
            ScheduleException.create({
                DoctorProfileId: doctorProfile.id,
                ClinicId: clinic.id,
                date: '2026-09-05',
                type: 'extra',
                startTime: '13:00',
                endTime: '16:00',
            })
        ).rejects.toThrow(Sequelize.UniqueConstraintError);
    });

    it("menyimpan ScheduleException type 'off' seharian yang valid (happy path)", async () => {
        const exception = await ScheduleException.create({
            DoctorProfileId: doctorProfile.id,
            ClinicId: null,
            date: '2026-09-06',
            type: 'off',
            startTime: null,
            endTime: null,
            reason: 'Cuti',
        });

        expect(exception.id).toBeDefined();
        expect(exception.type).toBe('off');
    });
});
