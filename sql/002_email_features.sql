-- Migration 002: add domain to clients for email auto-classification
ALTER TABLE clients ADD COLUMN domain TEXT;
