// middleware/requireLogin.js
module.exports = function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    // User is logged in, continue
    return next();
  }

  // If request is AJAX / fetch (JSON) respond with 401
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.status(401).json({ error: 'Unauthorized: Please log in' });
  }

  // Otherwise, redirect to login page
  res.redirect('/loginpage/login');
};
