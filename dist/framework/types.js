"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Forbidden = exports.Unauthorized = exports.UnsupportedMediaType = exports.InternalServerError = exports.RequestEntityToLarge = exports.BadRequest = exports.MethodNotAllowed = exports.NotFound = exports.HttpError = void 0;
class HttpError extends Error {
    constructor(err) {
        super(err.name);
        this.name = err.name;
        this.status = err.status;
        this.path = err.path;
        this.message = err.message;
        this.errors =
            err.errors == undefined
                ? [
                    {
                        path: err.path,
                        message: err.message,
                    },
                ]
                : err.errors;
    }
    static create(err) {
        switch (err.status) {
            case 400:
                return new BadRequest(err);
            case 401:
                return new Unauthorized(err);
            case 403:
                return new Forbidden(err);
            case 404:
                return new NotFound(err);
            case 405:
                return new MethodNotAllowed(err);
            case 413:
                return new RequestEntityToLarge(err);
            case 415:
                return new UnsupportedMediaType(err);
            default:
                return new InternalServerError(err);
        }
    }
}
exports.HttpError = HttpError;
class NotFound extends HttpError {
    constructor(err) {
        super({
            status: err.overrideStatus || 404,
            path: err.path,
            message: err.message,
            name: 'Not Found',
        });
    }
}
exports.NotFound = NotFound;
class MethodNotAllowed extends HttpError {
    constructor(err) {
        super({
            status: err.overrideStatus || 405,
            path: err.path,
            name: 'Method Not Allowed',
            message: err.message,
        });
    }
}
exports.MethodNotAllowed = MethodNotAllowed;
class BadRequest extends HttpError {
    constructor(err) {
        super({
            status: err.overrideStatus || 400,
            path: err.path,
            name: 'Bad Request',
            message: err.message,
            errors: err.errors,
        });
    }
}
exports.BadRequest = BadRequest;
class RequestEntityToLarge extends HttpError {
    constructor(err) {
        super({
            status: err.overrideStatus || 413,
            path: err.path,
            name: 'Request Entity Too Large',
            message: err.message,
        });
    }
}
exports.RequestEntityToLarge = RequestEntityToLarge;
class InternalServerError extends HttpError {
    constructor(err) {
        super({
            status: err.overrideStatus || 500,
            path: err.path,
            name: 'Internal Server Error',
            message: err.message,
            errors: err.errors,
        });
    }
}
exports.InternalServerError = InternalServerError;
class UnsupportedMediaType extends HttpError {
    constructor(err) {
        super({
            status: err.overrideStatus || 415,
            path: err.path,
            name: 'Unsupported Media Type',
            message: err.message,
        });
    }
}
exports.UnsupportedMediaType = UnsupportedMediaType;
class Unauthorized extends HttpError {
    constructor(err) {
        super({
            status: err.overrideStatus || 401,
            path: err.path,
            name: 'Unauthorized',
            message: err.message,
        });
    }
}
exports.Unauthorized = Unauthorized;
class Forbidden extends HttpError {
    constructor(err) {
        super({
            status: err.overrideStatus || 403,
            path: err.path,
            name: 'Forbidden',
            message: err.message,
        });
    }
}
exports.Forbidden = Forbidden;
//# sourceMappingURL=types.js.map