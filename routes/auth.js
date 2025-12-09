const router = require('express').Router();
const { User } = require('../models/usermodule');
const Joi = require('joi');
const bcrypt = require('bcrypt');

router.post('/', async (req, res) => {
  try {
    const { error } = validate(req.body);
    if (error)
      return res.status(400).send({ message: error.details[0].message });

    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res.status(401).send({ message: 'Invalid Email or Password' });

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword)
      return res.status(401).send({ message: 'Invalid Email or Password' });

    const token = User.generateAuthToken(user);
    res.status(200).send({ data: token, message: 'logged in successfully' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

const validate = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().label('Email'),
    password: Joi.string().required().label('Password'),
  });
  return schema.validate(data);
};

// Google OAuth Login Route
router.post('/google', async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).send({ message: 'Google OAuth not configured' });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).send({ message: 'Google credential is required' });
    }

    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).send({ message: 'Invalid Google token' });
    }

    const { sub: googleId, email, given_name, family_name, picture } = payload;

    if (!email) {
      return res.status(400).send({ message: 'Email not provided by Google' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists - update Google info if not already set
      if (!user.googleId) {
        user = await User.update(user.id, {
          googleId: googleId,
          picture: picture || user.picture,
          authProvider: 'google',
        });
      }
    } else {
      // Create new user
      user = await User.create({
        firstName: given_name || 'User',
        lastName: family_name || '',
        email,
        googleId,
        picture: picture || null,
        authProvider: 'google',
      });
    }

    if (!user) {
      return res
        .status(500)
        .send({ message: 'Failed to create or update user' });
    }

    // Generate JWT token
    const token = User.generateAuthToken(user);
    res
      .status(200)
      .send({ data: token, message: 'Logged in successfully with Google' });
  } catch (error) {
    console.error('Google OAuth Error:', error);
    if (error.message && error.message.includes('Token used too early')) {
      res
        .status(401)
        .send({ message: 'Token validation failed. Please try again.' });
    } else {
      res.status(500).send({
        message: 'Google authentication failed',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
});

module.exports = router;
