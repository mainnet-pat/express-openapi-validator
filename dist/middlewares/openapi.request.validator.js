"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestValidator = void 0;
const ajv_1 = require("../framework/ajv");
const util_1 = require("./util");
const types_1 = require("../framework/types");
const body_parse_1 = require("./parsers/body.parse");
const schema_parse_1 = require("./parsers/schema.parse");
const req_parameter_mutator_1 = require("./parsers/req.parameter.mutator");
class RequestValidator {
    constructor(apiDoc, options = {}) {
        this.middlewareCache = {};
        this.requestOpts = {};
        this.middlewareCache = {};
        this.apiDoc = apiDoc;
        this.requestOpts.allowUnknownQueryParameters =
            options.allowUnknownQueryParameters;
        this.ajv = ajv_1.createRequestAjv(apiDoc, options);
    }
    validate(req, res, next) {
        var _a;
        if (!req.openapi) {
            // this path was not found in open api and
            // this path is not defined under an openapi base path
            // skip it
            return next();
        }
        const openapi = req.openapi;
        const path = openapi.expressRoute;
        if (!path) {
            throw new types_1.NotFound({
                path: req.path,
                message: 'not found',
            });
        }
        const reqSchema = openapi.schema;
        if (!reqSchema) {
            throw new types_1.MethodNotAllowed({
                path: req.path,
                message: `${req.method} method not allowed`,
            });
        }
        // cache middleware by combining method, path, and contentType
        const contentType = util_1.ContentType.from(req);
        const contentTypeKey = (_a = contentType.equivalents()[0]) !== null && _a !== void 0 ? _a : 'not_provided';
        // use openapi.expressRoute as path portion of key
        const key = `${req.method}-${path}-${contentTypeKey}`;
        if (!this.middlewareCache[key]) {
            const middleware = this.buildMiddleware(path, reqSchema, contentType);
            this.middlewareCache[key] = middleware;
        }
        return this.middlewareCache[key](req, res, next);
    }
    buildMiddleware(path, reqSchema, contentType) {
        const apiDoc = this.apiDoc;
        const schemaParser = new schema_parse_1.ParametersSchemaParser(this.ajv, apiDoc);
        const bodySchemaParser = new body_parse_1.BodySchemaParser(this.ajv, apiDoc);
        const parameters = schemaParser.parse(path, reqSchema.parameters);
        const securityQueryParam = Security.queryParam(apiDoc, reqSchema);
        const body = bodySchemaParser.parse(path, reqSchema, contentType);
        const isBodyBinary = (body === null || body === void 0 ? void 0 : body['format']) === 'binary';
        const properties = Object.assign(Object.assign({}, parameters), { body: isBodyBinary ? {} : body });
        // TODO throw 400 if missing a required binary body
        const required = body.required && !isBodyBinary ? ['body'] : [];
        // $schema: "http://json-schema.org/draft-04/schema#",
        const schema = {
            paths: this.apiDoc.paths,
            components: this.apiDoc.components,
            required: ['query', 'headers', 'params'].concat(required),
            properties,
        };
        const validator = this.ajv.compile(schema);
        return (req, res, next) => {
            var _a, _b;
            const openapi = req.openapi;
            const hasPathParams = Object.keys(openapi.pathParams).length > 0;
            if (hasPathParams) {
                req.params = (_a = openapi.pathParams) !== null && _a !== void 0 ? _a : req.params;
            }
            const mutator = new req_parameter_mutator_1.RequestParameterMutator(this.ajv, apiDoc, path, properties);
            mutator.modifyRequest(req);
            if (!this.requestOpts.allowUnknownQueryParameters) {
                this.processQueryParam(req.query, schema.properties.query, securityQueryParam);
            }
            const cookies = req.cookies
                ? Object.assign(Object.assign({}, req.cookies), req.signedCookies) : undefined;
            const valid = validator(Object.assign(Object.assign({}, req), { cookies, headers: {...req.headers} }));
            if (valid) {
                next();
            }
            else {
                const errors = util_1.augmentAjvErrors([...((_b = validator.errors) !== null && _b !== void 0 ? _b : [])]);
                const err = util_1.ajvErrorsToValidatorError(400, errors);
                const message = this.ajv.errorsText(errors, { dataVar: 'request' });
                const error = new types_1.BadRequest({
                    path: req.path,
                    message: message,
                });
                error.errors = err.errors;
                throw error;
            }
        };
    }
    processQueryParam(query, schema, whiteList = []) {
        const keys = schema.properties ? Object.keys(schema.properties) : [];
        const knownQueryParams = new Set(keys);
        whiteList.forEach((item) => knownQueryParams.add(item));
        const queryParams = Object.keys(query);
        const allowedEmpty = schema.allowEmptyValue;
        for (const q of queryParams) {
            if (!this.requestOpts.allowUnknownQueryParameters &&
                !knownQueryParams.has(q)) {
                throw new types_1.BadRequest({
                    path: `.query.${q}`,
                    message: `Unknown query parameter '${q}'`,
                });
            }
            else if (!(allowedEmpty === null || allowedEmpty === void 0 ? void 0 : allowedEmpty.has(q)) && (query[q] === '' || null)) {
                throw new types_1.BadRequest({
                    path: `.query.${q}`,
                    message: `Empty value found for query parameter '${q}'`,
                });
            }
        }
    }
}
exports.RequestValidator = RequestValidator;
class Security {
    static queryParam(apiDocs, schema) {
        var _a;
        const hasPathSecurity = schema.hasOwnProperty('security') && schema.security.length > 0;
        const hasRootSecurity = apiDocs.hasOwnProperty('security') && apiDocs.security.length > 0;
        let usedSecuritySchema = [];
        if (hasPathSecurity) {
            usedSecuritySchema = schema.security;
        }
        else if (hasRootSecurity) {
            // if no security schema for the path, use top-level security schema
            usedSecuritySchema = apiDocs.security;
        }
        const securityQueryParameter = this.getSecurityQueryParams(usedSecuritySchema, (_a = apiDocs.components) === null || _a === void 0 ? void 0 : _a.securitySchemes);
        return securityQueryParameter;
    }
    static getSecurityQueryParams(usedSecuritySchema, securitySchema) {
        return usedSecuritySchema && securitySchema
            ? usedSecuritySchema
                .filter((obj) => Object.entries(obj).length !== 0)
                .map((sec) => {
                const securityKey = Object.keys(sec)[0];
                return securitySchema[securityKey];
            })
                .filter((sec) => (sec === null || sec === void 0 ? void 0 : sec.type) === 'apiKey' && (sec === null || sec === void 0 ? void 0 : sec.in) == 'query')
                .map((sec) => sec.name)
            : [];
    }
}
//# sourceMappingURL=openapi.request.validator.js.map