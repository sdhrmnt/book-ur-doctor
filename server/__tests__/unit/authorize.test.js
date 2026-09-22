jest.mock('../../services/accessService', () => ({ can: jest.fn() }), { virtual: true });

const AccessService = require('../../services/accessService');
const authorize = require('../../middlewares/authorize');

function mockReqRes(role) {
  return { req: { user: { role } }, res: {}, next: jest.fn() };
}

describe('authorize', () => {
  afterEach(() => jest.clearAllMocks());

  it('memanggil next() tanpa error kalau AccessService.can mengembalikan true', () => {
    AccessService.can.mockReturnValue(true);
    const { req, res, next } = mockReqRes('doctor');

    authorize('appointment.confirm')(req, res, next);

    expect(AccessService.can).toHaveBeenCalledWith('doctor', 'appointment.confirm');
    expect(next).toHaveBeenCalledWith();
  });

  it('melempar Forbidden dengan requiredRole kalau AccessService.can mengembalikan false', () => {
    AccessService.can.mockReturnValue(false);
    const { req, res, next } = mockReqRes('patient');

    authorize('doctor.verify')(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Forbidden', requiredRole: 'patient' })
    );
  });
});
