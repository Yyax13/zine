function getBaseUrl(req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    return `${proto}://${host}`;
}

export function seoMiddleware(req, res, next) {
    res.locals.baseUrl = getBaseUrl(req);
    res.locals.siteName = req.headers.host;
    res.locals.path = req.originalUrl;
    next();
};