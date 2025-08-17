-- Seed data for testing the AI Image Generator SaaS
-- This creates test users for development and testing

-- Insert test users (using SHA-256 hashes for Cloudflare Workers compatibility)
INSERT OR IGNORE INTO users (username, email, password_hash, paid_status) VALUES 
  ('testuser', 'test@example.com', 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae', FALSE), -- password: test123
  ('paiduser', 'paid@example.com', 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae', TRUE),  -- password: test123
  ('admin', 'admin@example.com', 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae', TRUE);   -- password: test123

-- Insert test payment for paid user
INSERT OR IGNORE INTO payments (user_id, stripe_session_id, stripe_payment_intent_id, amount, status) VALUES 
  (2, 'cs_test_session_12345', 'pi_test_12345', 500, 'completed'),
  (3, 'cs_test_session_67890', 'pi_test_67890', 500, 'completed');

-- Insert sample image generations for paid users
INSERT OR IGNORE INTO generations (user_id, prompt, image_url, processing_time_ms) VALUES 
  (2, 'A beautiful sunset over mountains', 'https://picsum.photos/512/512?random=1', 2340),
  (2, 'Cute cat sitting in a garden', 'https://picsum.photos/512/512?random=2', 1890),
  (2, 'Futuristic city with flying cars', 'https://picsum.photos/512/512?random=3', 2756),
  (3, 'Abstract digital art with vibrant colors', 'https://picsum.photos/512/512?random=4', 2123),
  (3, 'Portrait of a wise old wizard', 'https://picsum.photos/512/512?random=5', 3001);