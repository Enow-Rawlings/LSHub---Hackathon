/**
 * Request body validation middleware using Zod.
 * Strips unknown keys and casts types to block NoSQL injection via type coercion.
 * Usage: validate(zodSchema)
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Validation failed', errors });
    }
    // Replace req.body with the parsed (cast + stripped) data
    req.body = result.data;
    next();
  };
}

module.exports = validate;
