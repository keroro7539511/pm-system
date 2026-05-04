-- Migration 003: add start_date to tasks for calendar scheduling
ALTER TABLE tasks ADD COLUMN start_date DATE;
