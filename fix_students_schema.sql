-- Add missing columns to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS training_days TEXT[] DEFAULT '{}';
