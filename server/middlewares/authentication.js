const { verifyToken } = require('../helpers/jwt');
const { User, DoctorProfile } = require('../models');

async function authentication(req, res, next) {
    try {
        const bearerToken = req.headers.authorization;
        if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
            throw { name: 'Unauthorized', message: 'Token tidak ditemukan' };
        }

        const token = bearerToken.split(' ')[1];

        let payload;
        try {
            payload = verifyToken(token);
        } catch (jwtError) {
            throw { name: 'Unauthorized', message: 'Token tidak valid' };
        }

        const user = await User.findByPk(payload.id);
        if (!user || !user.isActive) {
            throw { name: 'Unauthorized', message: 'Token tidak valid' };
        }

        req.user = { id: user.id, role: user.role };

        if (user.role === 'doctor') {
            const doctorProfile = await DoctorProfile.findOne({ where: { UserId: user.id } });
            req.user.DoctorProfileId = doctorProfile ? doctorProfile.id : null;
        }

        next();
    } catch (error) {
        next(error);
    }
}

module.exports = authentication;