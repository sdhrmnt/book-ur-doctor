const { Op } = require('sequelize');
const { Appointment } = require('../models');

const CAPABILITIES = {
    patient: [
        'appointment.book',
        'appointment.cancel',
        'appointment.reschedule',
        'document.upload',
        'document.read.own',
        'summary.request',
        'chat.use',
    ],
    doctor: [
        'appointment.confirm',
        'appointment.complete',
        'appointment.no_show',
        'appointment.cancel',
        'document.read.linked',
        'summary.request',
        'note.write',
        'schedule.manage',
        'chat.use',
    ],
    admin: [
        'doctor.create',
        'doctor.verify',
        'appointment.cancel',
        'schedule.manage',
        'stats.read',
    ],
};

class AccessService {
    static can(role, capability) {
        return CAPABILITIES[role].includes(capability);
    }

    // Dipakai untuk GET /api/documents/:id/url dan /summary — TESTING.md E32-E35
    static async canReadDocument(actor, document) {
        if (actor.role === 'admin') {
            return false; // admin TIDAK PERNAH baca data klinis — SPEC.md §5
        }
        if (actor.role === 'patient') {
            return document.PatientId === actor.id;
        }
        // doctor: harus punya janji temu confirmed/completed dengan pasien pemilik dokumen
        const linked = await Appointment.count({
            where: {
                PatientId: document.PatientId,
                DoctorProfileId: actor.DoctorProfileId,
                status: { [Op.in]: ['confirmed', 'completed'] },
            },
        });
        return linked > 0;
    }


    static appointmentScope(user) {
        if (user.role === 'patient') {
            return { PatientId: user.id };
        }
        if (user.role === 'doctor') {
            return { DoctorProfileId: user.DoctorProfileId };
        }
        return {}; // admin: lihat semua
    }
}

module.exports = AccessService;