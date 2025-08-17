// Type definitions for the AI Image Generator SaaS

export interface User {
  id: number;
  username: string;
  email: string;
  paid_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  user_id: number;
  stripe_session_id: string;
  stripe_payment_intent_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: number;
  user_id: number;
  prompt: string;
  image_url: string;
  processing_time_ms: number;
  created_at: string;
}

export interface AuthRequest {
  username?: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: Omit<User, 'password_hash'>;
}

export interface GenerateImageRequest {
  prompt: string;
}

export interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  message?: string;
  processingTime?: number;
}

export interface PaymentSessionResponse {
  sessionId: string;
  url: string;
}

export interface CloudflareBindings {
  DB: D1Database;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

// Hono Context type with Cloudflare bindings
export type HonoContext = {
  Bindings: CloudflareBindings;
  Variables: {
    user?: User;
  };
};