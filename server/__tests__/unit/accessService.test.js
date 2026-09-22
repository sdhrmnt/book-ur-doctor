jest.mock('../../models', () => ({ Appointment: { count: jest.fn() } }));
const { Appointment } = require('../../models');
const AccessService = require('../../services/accessService');

describe('AccessService.can', () => {
    it('true untuk capability yang dimiliki role', () => {
        expect(AccessService.can('patient', 'appointment.book')).toBe(true);
        expect(AccessService.can('doctor', 'note.write')).toBe(true);
        expect(AccessService.can('admin', 'doctor.verify')).toBe(true);
    });

    it('false untuk capability yang tidak dimiliki role', () => {
        expect(AccessService.can('patient', 'doctor.verify')).toBe(false);
        expect(AccessService.can('doctor', 'doctor.create')).toBe(false);
        expect(AccessService.can('admin', 'document.upload')).toBe(false);
    });
});

describe('AccessService.canReadDocument', () => {
    afterEach(() => jest.clearAllMocks());

    it('admin selalu false, walau dokumen miliknya sendiri (mustahil, tapi tetap false)', async () => {
        const result = await AccessService.canReadDocument(
            { role: 'admin', id: 1 },
            { PatientId: 1 }
        );
        expect(result).toBe(false);
        expect(Appointment.count).not.toHaveBeenCalled();
    });

    it('patient true kalau dokumen miliknya sendiri', async () => {
        const result = await AccessService.canReadDocument(
            { role: 'patient', id: 5 },
            { PatientId: 5 }
        );
        expect(result).toBe(true);
    });

    it('patient false kalau dokumen milik pasien lain', async () => {
        const result = await AccessService.canReadDocument(
            { role: 'patient', id: 5 },
            { PatientId: 9 }
        );
        expect(result).toBe(false);
    });

    it('doctor true kalau ada janji temu confirmed/completed dengan pasien itu', async () => {
        Appointment.count.mockResolvedValue(1);
        const result = await AccessService.canReadDocument(
            { role: 'doctor', DoctorProfileId: 3 },
            { PatientId: 5 }
        );
        expect(Appointment.count).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ PatientId: 5, DoctorProfileId: 3 }),
            })
        );
        expect(result).toBe(true);
    });

    it('doctor false kalau tidak ada janji temu terkait', async () => {
        Appointment.count.mockResolvedValue(0);
        const result = await AccessService.canReadDocument(
            { role: 'doctor', DoctorProfileId: 3 },
            { PatientId: 5 }
        );
        expect(result).toBe(false);
    });
});

describe('AccessService.appointmentScope', () => {
    it('patient hanya lihat miliknya', () => {
        expect(AccessService.appointmentScope({ role: 'patient', id: 5 })).toEqual({ PatientId: 5 });
    });

    it('doctor hanya lihat miliknya', () => {
        expect(AccessService.appointmentScope({ role: 'doctor', DoctorProfileId: 3 })).toEqual({
            DoctorProfileId: 3,
        });
    });

    it('admin lihat semua', () => {
        expect(AccessService.appointmentScope({ role: 'admin', id: 1 })).toEqual({});
    });
});