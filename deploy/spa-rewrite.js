// CloudFront Function — viewer-request handler.
//
// SPA fallback: any URI that doesn't look like an asset (.js/.css/.svg/etc.)
// is rewritten to /index.html so React Router can render the route on the
// client. Attach this function to the default behaviour of the distribution.
function handler(event) {
    var req = event.request;
    var uri = req.uri;

    // Pass real assets through unchanged.
    if (uri.indexOf('.') !== -1) {
        return req;
    }

    // Everything else is a deep link into the SPA.
    req.uri = '/index.html';
    return req;
}
