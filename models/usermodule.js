const jwt = require('jsonwebtoken');
const Joi = require('joi');
const passwordComplexity = require('joi-password-complexity');
const { getPool } = require('../userinformation');

// User model methods
const User = {
  // Find user by email
  async findOne(query) {
    const pool = getPool();
    if (!pool) throw new Error('Database connection not available');

    if (query.email) {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [
        query.email,
      ]);
      return result.rows[0] || null;
    }
    return null;
  },

  // Find user by ID
  async findById(id) {
    const pool = getPool();
    if (!pool) throw new Error('Database connection not available');

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  // Create new user
  async create(userData) {
    const pool = getPool();
    if (!pool) throw new Error('Database connection not available');

    const {
      firstName,
      lastName,
      email,
      password,
      googleId,
      picture,
      authProvider = 'local',
    } = userData;

    const result = await pool.query(
      `INSERT INTO users ("firstName", "lastName", email, password, "googleId", picture, "authProvider")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        firstName,
        lastName,
        email,
        password || null,
        googleId || null,
        picture || null,
        authProvider,
      ]
    );

    return result.rows[0];
  },

  // Update user
  async update(id, updates) {
    const pool = getPool();
    if (!pool) throw new Error('Database connection not available');

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        fields.push(`"${key}" = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return await this.findById(id);
    }

    fields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(
        ', '
      )} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  // Generate auth token (static method)
  generateAuthToken(user) {
    return jwt.sign({ _id: user.id }, process.env.JWTokenPrivateKey, {
      expiresIn: '10d',
    });
  },
};

// Validation schema
const validate = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().required().label('First Name'),
    lastName: Joi.string().required().label('Last Name'),
    email: Joi.string().email().required().label('Email'),
    password: passwordComplexity().required().label('Password'),
  });
  return schema.validate(data);
};

module.exports = { User, validate };
