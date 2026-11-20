-- Use the world's existing unique slug as its public route identifier.
UPDATE worlds SET slug = 'br1' WHERE id = 1 AND slug = 'beta';
