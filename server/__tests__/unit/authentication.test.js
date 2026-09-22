jest.mock('../../helpers/jwt', () => ({ verifyToken: jest.fn() }));
jest.mock('../../models', () => ({
  User: { findByPk: jest.fn() },
  DoctorProfile: { findOne: jest.fn() },
}));

const { verifyToken } = require('../../helpers/jwt');
const { User, DoctorProfile } = require('../../models');
const authentication = require('../../middlewares/authentication');

function mockReqRes(headers = {}) {
  return { req: { headers }, res: {}, next: jest.fn() };
}

describe('authentication', () => {
  afterEach(() => jest.clearAllMocks());

  it('menolak request tanpa header Authorization', async () => {
    const { req, res, next } = mockReqRes({});

    await authentication(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'Unauthorized' }));
  });

  it('menolak header yang tidak diawali "Bearer "', async () => {
    const { req, res, next } = mockReqRes({ authorization: 'Token abc' });

    await authentication(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'Unauthorized' }));
  });

  it('menolak token yang gagal diverifikasi dengan 401, bukan membiarkan error jwt bocor ke 500', async () => {
    verifyToken.mockImplementation(() => {
      throw new Error('jwt malformed');
    });
    const { req, res, next } = mockReqRes({ authorization: 'Bearer invalid' });

    await authentication(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'Unauthorized' }));
  });

  it('menolak user yang isActive false (TESTING.md E5)', async () => {
    verifyToken.mockReturnValue({ id: 1, role: 'patient' });
    User.findByPk.mockResolvedValue({ id: 1, role: 'patient', isActive: false });
    const { req, res, next } = mockReqRes({ authorization: 'Bearer valid' });

    await authentication(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'Unauthorized' }));
  });

  it('menolak kalau user pemilik token tidak ditemukan', async () => {
    verifyToken.mockReturnValue({ id: 999, role: 'patient' });
    User.findByPk.mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ authorization: 'Bearer valid' });

    await authentication(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'Unauthorized' }));
  });

  it('mengisi req.user { id, role } untuk pasien tanpa query DoctorProfile', async () => {
    verifyToken.mockReturnValue({ id: 2, role: 'patient' });
    User.findByPk.mockResolvedValue({ id: 2, role: 'patient', isActive: true });
    const { req, res, next } = mockReqRes({ authorization: 'Bearer valid' });

    await authentication(req, res, next);

    expect(req.user).toEqual({ id: 2, role: 'patient' });
    expect(DoctorProfile.findOne).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('membaca ulang DoctorProfileId dari DB untuk role doctor (ARCHITECTURE.md §5)', async () => {
    verifyToken.mockReturnValue({ id: 9, role: 'doctor' });
    User.findByPk.mockResolvedValue({ id: 9, role: 'doctor', isActive: true });
    DoctorProfile.findOne.mockResolvedValue({ id: 7, UserId: 9 });
    const { req, res, next } = mockReqRes({ authorization: 'Bearer valid' });

    await authentication(req, res, next);

    expect(DoctorProfile.findOne).toHaveBeenCalledWith({ where: { UserId: 9 } });
    expect(req.user).toEqual({ id: 9, role: 'doctor', DoctorProfileId: 7 });
    expect(next).toHaveBeenCalledWith();
  });

  it('DoctorProfileId null kalau dokter belum punya profil terverifikasi', async () => {
    verifyToken.mockReturnValue({ id: 10, role: 'doctor' });
    User.findByPk.mockResolvedValue({ id: 10, role: 'doctor', isActive: true });
    DoctorProfile.findOne.mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ authorization: 'Bearer valid' });

    await authentication(req, res, next);

    expect(req.user.DoctorProfileId).toBeNull();
  });
});
