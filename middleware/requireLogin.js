module.exports = function requireLogin(req, res, next) {
  if (req.session && req.session.player) return next();
  res.redirect('/loginpage/login');
};
