function errorHandler(error, req, res, next) {
    console.error({ name: error.name, message: error.message, path: req.path });

    let status = 500;
    let body = { message: 'Terjadi kesalahan pada server' };

    if (error.name === 'SequelizeValidationError') {
        status = 400;
        body = { message: error.errors[0].message };
    } else if (error.name === 'BadRequest') {
        status = 400;
        body = { message: error.message };
    } else if (error.name === 'Unauthorized' || error.name === 'JsonWebTokenError' || error.name === 'LoginError') {
        status = 401;
        body = { message: error.message || 'Silakan login terlebih dahulu' };
    } else if (error.name === 'Forbidden') {
        status = 403;
        body = { message: error.message, requiredRole: error.requiredRole };
    } else if (error.name === 'NotFound') {
        status = 404;
        body = { message: error.message || 'Data tidak ditemukan' };
    } else if (error.name === 'Conflict') {
        status = 409;
        body = { message: error.message };
    } else if (error.name === 'SequelizeUniqueConstraintError') {
        status = 409;
        body = { message: 'Jadwal ini sudah dipesan pasien lain' };
    } else if (error.name === 'PayloadTooLarge') {
        status = 413;
        body = { message: error.message };
    } else if (error.name === 'UnsupportedMediaType') {
        status = 415;
        body = { message: error.message };
    } else if (error.name === 'SummaryRejected') {
        status = 422;
        body = { message: 'Ringkasan tidak tersedia untuk dokumen ini' };
    }

    res.status(status).json(body);
}

module.exports = errorHandler;