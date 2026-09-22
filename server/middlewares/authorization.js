const AccessService = require('../services/accessService');

function authorize(capability) {
    return function (req, res, next) {
        try {
            if (!AccessService.can(req.user.role, capability)) {
                throw {
                    name: 'Forbidden',
                    message: 'Kamu tidak berhak melakukan ini',
                    requiredRole: req.user.role,
                };
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = authorize;