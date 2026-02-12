function success(res, message, data = null, status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data
  });
}

function error(res, message, code, status = 400) {
  return res.status(status).json({
    success: false,
    message,
    code
  });
}

module.exports = {
  success,
  error
};
