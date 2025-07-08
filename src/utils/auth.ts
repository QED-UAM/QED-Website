function isAuthorized(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/auth/google");
}

function isNotAuthorized(req, res, next) {
    if (!req.isAuthenticated()) return next();
    res.status(404).render("errors/404");
}

export { isAuthorized, isNotAuthorized };
