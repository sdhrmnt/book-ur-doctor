const errorHandler = require('../../middlewares/errorHandler');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('errorHandler', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('SequelizeValidationError -> 400', () => {
    const res = mockRes();
    const error = { name: 'SequelizeValidationError', errors: [{ message: 'Email tidak valid' }] };

    errorHandler(error, { path: '/api/auth/register' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('BadRequest -> 400, body { message: "x" }', () => {
    const res = mockRes();
    const error = { name: 'BadRequest', message: 'x' };

    errorHandler(error, { path: '/api/x' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'x' });
  });

  it.each(['Unauthorized', 'JsonWebTokenError', 'LoginError'])('%s -> 401', (name) => {
    const res = mockRes();
    const error = { name };

    errorHandler(error, { path: '/api/x' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('Forbidden -> 403, body memuat requiredRole', () => {
    const res = mockRes();
    const error = { name: 'Forbidden', message: 'x', requiredRole: 'doctor' };

    errorHandler(error, { path: '/api/x' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ requiredRole: 'doctor' }));
  });

  it('NotFound -> 404', () => {
    const res = mockRes();
    const error = { name: 'NotFound' };

    errorHandler(error, { path: '/api/x' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it.each(['Conflict', 'SequelizeUniqueConstraintError'])('%s -> 409', (name) => {
    const res = mockRes();
    const error = { name };

    errorHandler(error, { path: '/api/x' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('Conflict memakai error.message sendiri (mis. "Email sudah terdaftar"), bukan pesan jadwal', () => {
    const res = mockRes();
    const error = { name: 'Conflict', message: 'Email sudah terdaftar' };

    errorHandler(error, { path: '/api/auth/register' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email sudah terdaftar' });
  });

  it('SequelizeUniqueConstraintError mentah tetap pesan jadwal (dipakai booking E16), tidak boleh ikut berubah', () => {
    const res = mockRes();
    const error = { name: 'SequelizeUniqueConstraintError' };

    errorHandler(error, { path: '/api/appointments' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Jadwal ini sudah dipesan pasien lain' });
  });

  it('PayloadTooLarge -> 413', () => {
    const res = mockRes();
    const error = { name: 'PayloadTooLarge', message: 'x' };

    errorHandler(error, { path: '/api/x' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(413);
  });

  it('UnsupportedMediaType -> 415', () => {
    const res = mockRes();
    const error = { name: 'UnsupportedMediaType', message: 'x' };

    errorHandler(error, { path: '/api/x' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(415);
  });

  it('SummaryRejected -> 422', () => {
    const res = mockRes();
    const error = { name: 'SummaryRejected' };

    errorHandler(error, { path: '/api/x' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('error dengan name yang tidak dikenal -> 500', () => {
    const res = mockRes();
    const error = { name: 'SomethingWeird' };

    errorHandler(error, { path: '/api/x' }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('console.error dipanggil dengan { name, message, path } saja, bukan error mentah utuh', () => {
    const res = mockRes();
    const error = { name: 'BadRequest', message: 'x', stack: 'SENSITIVE STACK TRACE' };

    errorHandler(error, { path: '/api/rahasia' }, res, jest.fn());

    expect(consoleErrorSpy).toHaveBeenCalledWith({
      name: 'BadRequest',
      message: 'x',
      path: '/api/rahasia',
    });
  });
});
