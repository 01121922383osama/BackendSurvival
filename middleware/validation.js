const Joi = require('joi');

// Validation schema for user registration
const signupSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  })
});

// Validation schema for user login
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

// Validation schema for user update
const updateUserSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).optional().messages({
    'string.min': 'Password must be at least 6 characters long'
  })
});

// Validation schema for log creation
const logSchema = Joi.object({
  deviceId: Joi.string().required().messages({
    'any.required': 'Device ID is required'
  }),
  timestamp: Joi.string().isoDate().required().messages({
    'string.isoDate': 'Timestamp must be a valid ISO 8601 date string',
    'any.required': 'Timestamp is required'
  }),
  params: Joi.object().required().messages({
    'any.required': 'Params object is required'
  })
});

// Middleware function for validating request body
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: error.details[0].message 
      });
    }
    next();
  };
};

module.exports = {
  validateSignup: validateRequest(signupSchema),
  validateLogin: validateRequest(loginSchema),
  validateUpdateUser: validateRequest(updateUserSchema),
  validateLog: validateRequest(logSchema)
};
