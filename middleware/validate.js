export const validate = (schema) => (req, res, next) => {
  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    const val = req.body[field];
    const isEmpty = val === undefined || val === null || String(val).trim() === '';
    if (rules.required && isEmpty) {
      errors.push(`${field} is required`);
      continue;
    }
    if (isEmpty) continue;
    if (rules.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
      errors.push(`${field} must be a valid email`);
    }
    if (rules.min !== undefined && String(val).length < rules.min) {
      errors.push(`${field} must be at least ${rules.min} characters`);
    }
    if (rules.max !== undefined && String(val).length > rules.max) {
      errors.push(`${field} must be at most ${rules.max} characters`);
    }
    if (rules.pattern && !rules.pattern.test(String(val))) {
      errors.push(`${field} format is invalid`);
    }
  }
  if (errors.length > 0) return res.status(400).json({ errors });
  next();
};