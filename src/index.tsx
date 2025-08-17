import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { sign, verify } from 'hono/jwt'
// Web Crypto API functions for password hashing (Cloudflare Workers compatible)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password)
  return newHash === hash
}
import type { 
  HonoContext, 
  User, 
  AuthRequest, 
  AuthResponse, 
  GenerateImageRequest, 
  GenerateImageResponse,
  PaymentSessionResponse,
  Generation 
} from './types'

const app = new Hono<HonoContext>()

// Enable CORS for all routes
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))

// Authentication middleware
const authMiddleware = async (c: any, next: any) => {
  const authorization = c.req.header('Authorization')
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authorization.split(' ')[1]
  try {
    const payload = await verify(token, c.env.JWT_SECRET) as any
    
    // Get user from database
    const user = await c.env.DB.prepare(
      'SELECT id, username, email, paid_status, created_at, updated_at FROM users WHERE id = ?'
    ).bind(payload.userId).first()

    if (!user) {
      return c.json({ error: 'User not found' }, 401)
    }

    c.set('user', user)
    await next()
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

// Mock AI image generation function
const generateImage = async (prompt: string): Promise<{ imageUrl: string; processingTime: number }> => {
  // Simulate processing time (2-3 seconds)
  const processingTime = Math.floor(Math.random() * 1000) + 2000
  await new Promise(resolve => setTimeout(resolve, processingTime))
  
  // Generate different placeholder images based on prompt keywords
  let imageId = 1
  const lowerPrompt = prompt.toLowerCase()
  
  if (lowerPrompt.includes('cat') || lowerPrompt.includes('kitten')) {
    imageId = Math.floor(Math.random() * 5) + 10 // Cat images 10-14
  } else if (lowerPrompt.includes('landscape') || lowerPrompt.includes('mountain') || lowerPrompt.includes('sunset')) {
    imageId = Math.floor(Math.random() * 5) + 15 // Landscape images 15-19
  } else if (lowerPrompt.includes('portrait') || lowerPrompt.includes('person') || lowerPrompt.includes('face')) {
    imageId = Math.floor(Math.random() * 5) + 20 // Portrait images 20-24
  } else if (lowerPrompt.includes('city') || lowerPrompt.includes('building') || lowerPrompt.includes('urban')) {
    imageId = Math.floor(Math.random() * 5) + 25 // City images 25-29
  } else {
    imageId = Math.floor(Math.random() * 20) + 30 // Abstract/other images 30-49
  }
  
  return {
    imageUrl: `https://picsum.photos/512/512?random=${imageId}`,
    processingTime
  }
}

// API Routes

// User Registration
app.post('/api/auth/signup', async (c) => {
  try {
    const { username, email, password }: AuthRequest = await c.req.json()
    
    // Validation
    if (!username || !email || !password) {
      return c.json({ success: false, message: 'All fields are required' } as AuthResponse, 400)
    }
    
    if (password.length < 6) {
      return c.json({ success: false, message: 'Password must be at least 6 characters' } as AuthResponse, 400)
    }
    
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ? OR username = ?'
    ).bind(email, username).first()
    
    if (existingUser) {
      return c.json({ success: false, message: 'User already exists' } as AuthResponse, 409)
    }
    
    // Hash password
    const passwordHash = await hashPassword(password)
    
    // Create user
    const result = await c.env.DB.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id, username, email, paid_status, created_at, updated_at'
    ).bind(username, email, passwordHash).first()
    
    if (!result) {
      return c.json({ success: false, message: 'Failed to create user' } as AuthResponse, 500)
    }
    
    // Generate JWT token
    const token = await sign({ userId: result.id }, c.env.JWT_SECRET)
    
    return c.json({
      success: true,
      token,
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        paid_status: result.paid_status,
        created_at: result.created_at,
        updated_at: result.updated_at
      }
    } as AuthResponse)
    
  } catch (error) {
    console.error('Signup error:', error)
    return c.json({ success: false, message: 'Internal server error' } as AuthResponse, 500)
  }
})

// User Login
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password }: AuthRequest = await c.req.json()
    
    if (!email || !password) {
      return c.json({ success: false, message: 'Email and password are required' } as AuthResponse, 400)
    }
    
    // Get user from database
    const user = await c.env.DB.prepare(
      'SELECT id, username, email, password_hash, paid_status, created_at, updated_at FROM users WHERE email = ?'
    ).bind(email).first() as any
    
    if (!user) {
      return c.json({ success: false, message: 'Invalid credentials' } as AuthResponse, 401)
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return c.json({ success: false, message: 'Invalid credentials' } as AuthResponse, 401)
    }
    
    // Generate JWT token
    const token = await sign({ userId: user.id }, c.env.JWT_SECRET)
    
    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        paid_status: user.paid_status,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    } as AuthResponse)
    
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ success: false, message: 'Internal server error' } as AuthResponse, 500)
  }
})

// Get current user
app.get('/api/auth/me', authMiddleware, async (c) => {
  const user = c.get('user')
  return c.json({ user })
})

// Create Stripe checkout session
app.post('/api/payment/create-session', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as User
    
    // Check if user already paid
    if (user.paid_status) {
      return c.json({ error: 'User already has access' }, 400)
    }
    
    // In a real implementation, you would create a Stripe session here
    // For this demo, we'll simulate it with a mock session
    const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const mockUrl = `https://checkout.stripe.com/pay/${mockSessionId}`
    
    // Store pending payment in database
    await c.env.DB.prepare(
      'INSERT INTO payments (user_id, stripe_session_id, amount, status) VALUES (?, ?, ?, ?)'
    ).bind(user.id, mockSessionId, 500, 'pending').run()
    
    return c.json({
      sessionId: mockSessionId,
      url: mockUrl
    } as PaymentSessionResponse)
    
  } catch (error) {
    console.error('Payment session error:', error)
    return c.json({ error: 'Failed to create payment session' }, 500)
  }
})

// Simulate payment completion (in real app, this would be a Stripe webhook)
app.post('/api/payment/complete/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId')
    
    // Find the payment
    const payment = await c.env.DB.prepare(
      'SELECT user_id FROM payments WHERE stripe_session_id = ? AND status = ?'
    ).bind(sessionId, 'pending').first() as any
    
    if (!payment) {
      return c.json({ error: 'Payment not found or already processed' }, 404)
    }
    
    // Update payment status
    await c.env.DB.prepare(
      'UPDATE payments SET status = ?, stripe_payment_intent_id = ? WHERE stripe_session_id = ?'
    ).bind('completed', `pi_test_${Date.now()}`, sessionId).run()
    
    // Update user paid status
    await c.env.DB.prepare(
      'UPDATE users SET paid_status = ? WHERE id = ?'
    ).bind(true, payment.user_id).run()
    
    return c.json({ success: true, message: 'Payment completed successfully' })
    
  } catch (error) {
    console.error('Payment completion error:', error)
    return c.json({ error: 'Failed to complete payment' }, 500)
  }
})

// Get payment status
app.get('/api/payment/status', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as User
    
    const payment = await c.env.DB.prepare(
      'SELECT created_at FROM payments WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(user.id, 'completed').first() as any
    
    return c.json({
      paid: user.paid_status,
      paymentDate: payment?.created_at || null
    })
    
  } catch (error) {
    console.error('Payment status error:', error)
    return c.json({ error: 'Failed to get payment status' }, 500)
  }
})

// Generate AI image
app.post('/api/image/generate', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as User
    const { prompt }: GenerateImageRequest = await c.req.json()
    
    // Check if user has paid
    if (!user.paid_status) {
      return c.json({
        success: false,
        message: 'Payment required. Please complete your payment to unlock image generation.'
      } as GenerateImageResponse, 403)
    }
    
    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      return c.json({
        success: false,
        message: 'Prompt is required'
      } as GenerateImageResponse, 400)
    }
    
    if (prompt.length > 500) {
      return c.json({
        success: false,
        message: 'Prompt must be less than 500 characters'
      } as GenerateImageResponse, 400)
    }
    
    // Generate image using mock AI
    const { imageUrl, processingTime } = await generateImage(prompt)
    
    // Save generation to database
    await c.env.DB.prepare(
      'INSERT INTO generations (user_id, prompt, image_url, processing_time_ms) VALUES (?, ?, ?, ?)'
    ).bind(user.id, prompt, imageUrl, processingTime).run()
    
    return c.json({
      success: true,
      imageUrl,
      processingTime
    } as GenerateImageResponse)
    
  } catch (error) {
    console.error('Image generation error:', error)
    return c.json({
      success: false,
      message: 'Failed to generate image. Please try again.'
    } as GenerateImageResponse, 500)
  }
})

// Get user's image generation history
app.get('/api/image/history', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as User
    
    const generations = await c.env.DB.prepare(
      'SELECT id, prompt, image_url, processing_time_ms, created_at FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
    ).bind(user.id).all()
    
    return c.json({ images: generations.results || [] })
    
  } catch (error) {
    console.error('History error:', error)
    return c.json({ error: 'Failed to get generation history' }, 500)
  }
})

// Main application routes

// Landing page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Image Generator - Create Amazing Images in Seconds</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#6366f1',
                  secondary: '#8b5cf6'
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-screen">
        <div id="app"></div>
        
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// Catch-all route for SPA routing
app.get('*', (c) => {
  const path = c.req.path
  if (path.startsWith('/api/') || path.startsWith('/static/')) {
    return c.notFound()
  }
  
  // Return the same HTML for SPA routing
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Image Generator - Create Amazing Images in Seconds</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#6366f1',
                  secondary: '#8b5cf6'
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-screen">
        <div id="app"></div>
        
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app