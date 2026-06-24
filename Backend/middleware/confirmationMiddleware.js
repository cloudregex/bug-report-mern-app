export const requireConfirmation = (req, res, next) => {
  const confirmed =
    req.body?.confirm === true
    || req.headers['x-confirm-action'] === 'true';

  if (!confirmed) {
    return res.status(400).json({
      success: false,
      message: 'This action requires confirmation. Send confirm: true in the request body or X-Confirm-Action: true header.'
    });
  }

  next();
};
