-- Seed data for testing the AI Image Generator SaaS
-- This creates test users for development and testing

-- Insert test users
INSERT OR IGNORE INTO users (username, email, password_hash, paid_status) VALUES 
  ('testuser', 'test@example.com', '$2b$10$rXhx8l0FK8pJ8X2sZ2EfKu/B6n5Z8qR5JcL6u3sO4Y7tA9.jV7n6e', FALSE), -- password: test123
  ('paiduser', 'paid@example.com', '$2b$10$rXhx8l0FK8pJ8X2sZ2EfKu/B6n5Z8qR5JcL6u3sO4Y7tA9.jV7n6e', TRUE),  -- password: test123
  ('admin', 'admin@example.com', '$2b$10$rXhx8l0FK8pJ8X2sZ2EfKu/B6n5Z8qR5JcL6u3sO4Y7tA9.jV7n6e', TRUE);   -- password: test123

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