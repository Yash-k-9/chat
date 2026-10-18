// validate(schema) returns a middleware that checks req.body against a zod schema.
// On success, req.body is replaced by the CLEANED data (trimmed, lowercased, defaults applied).
export default function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    next();
  };
}
