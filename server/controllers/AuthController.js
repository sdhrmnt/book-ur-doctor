const { User, PatientProfile, sequelize } = require('../models');
const { UniqueConstraintError } = require('sequelize');
const { signToken } = require('../helpers/jwt');
const { comparePassword } = require('../helpers/bcrypt');

class AuthController {
    static async register(req, res, next) {
        try {
            const { email, password, name, role } = req.body;

            if (role && role !== 'patient') {
                throw {
                    name: 'BadRequest',
                    message: 'Registrasi mandiri hanya untuk pasien. Akun dokter dibuat oleh admin.',
                };
            }

            let user;
            try {
                user = await sequelize.transaction(async (t) => {
                    const newUser = await User.create(
                        { email, password, name, role: 'patient' },
                        { transaction: t }
                    );
                    await PatientProfile.create({ UserId: newUser.id }, { transaction: t });
                    return newUser;
                });
            } catch (error) {
                if (error instanceof UniqueConstraintError) {
                    throw { name: 'Conflict', message: 'Email sudah terdaftar' };
                }
                throw error;
            }

            res.status(201).json({
                message: 'Registrasi berhasil',
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    static async login(req, res, next) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                throw { name: 'BadRequest', message: 'Email dan password wajib diisi' };
            }

            const user = await User.findOne({ where: { email } });
            if (!user || !user.isActive) {
                throw { name: 'Unauthorized', message: 'Email atau password salah' };
            }

            const isValidPassword = await comparePassword(password, user.password);
            if (!isValidPassword) {
                throw { name: 'Unauthorized', message: 'Email atau password salah' };
            }

            const access_token = signToken({ id: user.id, role: user.role });

            res.status(200).json({
                access_token,
                user: { id: user.id, email: user.email, name: user.name, role: user.role },
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;