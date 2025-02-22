-- Add store_url and detected_store columns to snacks table
ALTER TABLE snacks
ADD COLUMN store_url TEXT,
ADD COLUMN detected_store TEXT; 