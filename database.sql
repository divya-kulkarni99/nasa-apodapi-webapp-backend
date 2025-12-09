-- PostgreSQL Database Setup for NASA APOD Web App
-- Run this SQL script to create the users table

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "firstName" VARCHAR(255) NOT NULL,
  "lastName" VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  "googleId" VARCHAR(255) UNIQUE,
  picture VARCHAR(500),
  "authProvider" VARCHAR(50) DEFAULT 'local',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users("googleId");

