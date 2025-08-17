// AI Image Generator SaaS - Frontend Application
// Complete single-page application with authentication, payments, and image generation

class AIImageSaaS {
  constructor() {
    this.state = {
      user: null,
      token: localStorage.getItem('token'),
      currentPage: 'landing',
      loading: false,
      error: null,
      success: null,
      generations: [],
      isGenerating: false
    }
    
    this.init()
  }
  
  async init() {
    // Set initial route based on URL
    this.handleRouting()
    
    // Check if user is logged in
    if (this.state.token) {
      await this.verifyToken()
    } else {
      this.render()
    }
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.handleRouting()
      this.render()
    })
  }
  
  handleRouting() {
    const path = window.location.pathname
    if (path === '/login') {
      this.state.currentPage = 'login'
    } else if (path === '/signup') {
      this.state.currentPage = 'signup'
    } else if (path === '/payment') {
      this.state.currentPage = 'payment'
    } else if (path === '/dashboard') {
      this.state.currentPage = 'dashboard'
    } else {
      this.state.currentPage = 'landing'
    }
  }
  
  navigate(page) {
    this.state.currentPage = page
    const paths = {
      landing: '/',
      login: '/login',
      signup: '/signup',
      payment: '/payment',
      dashboard: '/dashboard'
    }
    
    history.pushState({}, '', paths[page] || '/')
    this.render()
  }
  
  async verifyToken() {
    if (!this.state.token) return
    
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.state.token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        this.state.user = data.user
        
        // Redirect to dashboard if user is on landing/auth pages
        if (['landing', 'login', 'signup'].includes(this.state.currentPage)) {
          this.navigate('dashboard')
          return
        }
      } else {
        // Invalid token
        localStorage.removeItem('token')
        this.state.token = null
        this.navigate('landing')
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      localStorage.removeItem('token')
      this.state.token = null
    }
    
    this.render()
  }
  
  showNotification(message, type = 'info') {
    if (type === 'error') {
      this.state.error = message
      this.state.success = null
    } else {
      this.state.success = message
      this.state.error = null
    }
    
    this.render()
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.state.error = null
      this.state.success = null
      this.render()
    }, 5000)
  }
  
  async handleAuth(type) {
    const form = document.getElementById(`${type}Form`)
    const formData = new FormData(form)
    const data = Object.fromEntries(formData)
    
    this.state.loading = true
    this.state.error = null
    this.render()
    
    try {
      const response = await fetch(`/api/auth/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (result.success) {
        this.state.token = result.token
        this.state.user = result.user
        localStorage.setItem('token', result.token)
        
        this.showNotification(`${type === 'login' ? 'Login' : 'Registration'} successful!`, 'success')
        
        // Redirect to payment if user hasn't paid, otherwise dashboard
        if (result.user.paid_status) {
          this.navigate('dashboard')
        } else {
          this.navigate('payment')
        }
      } else {
        this.showNotification(result.message || `${type} failed`, 'error')
      }
    } catch (error) {
      console.error(`${type} error:`, error)
      this.showNotification('Network error. Please try again.', 'error')
    }
    
    this.state.loading = false
    this.render()
  }
  
  async handlePayment() {
    if (!this.state.token) {
      this.navigate('login')
      return
    }
    
    this.state.loading = true
    this.render()
    
    try {
      const response = await fetch('/api/payment/create-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.state.token}`
        }
      })
      
      if (response.ok) {
        const { sessionId } = await response.json()
        
        // Simulate payment process (in real app, this would redirect to Stripe)
        this.showNotification('Processing payment...', 'info')
        
        // Simulate payment completion after 2 seconds
        setTimeout(async () => {
          try {
            const completeResponse = await fetch(`/api/payment/complete/${sessionId}`, {
              method: 'POST'
            })
            
            if (completeResponse.ok) {
              this.state.user.paid_status = true
              this.showNotification('Payment successful! You now have access to AI image generation.', 'success')
              this.navigate('dashboard')
            } else {
              this.showNotification('Payment processing failed. Please try again.', 'error')
            }
          } catch (error) {
            this.showNotification('Payment processing error. Please try again.', 'error')
          }
          
          this.state.loading = false
          this.render()
        }, 2000)
      } else {
        const error = await response.json()
        this.showNotification(error.error || 'Payment failed', 'error')
        this.state.loading = false
        this.render()
      }
    } catch (error) {
      console.error('Payment error:', error)
      this.showNotification('Network error. Please try again.', 'error')
      this.state.loading = false
      this.render()
    }
  }
  
  async generateImage() {
    const prompt = document.getElementById('promptInput').value.trim()
    
    if (!prompt) {
      this.showNotification('Please enter a prompt', 'error')
      return
    }
    
    if (prompt.length > 500) {
      this.showNotification('Prompt must be less than 500 characters', 'error')
      return
    }
    
    this.state.isGenerating = true
    this.state.error = null
    this.render()
    
    try {
      const response = await fetch('/api/image/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.state.token}`
        },
        body: JSON.stringify({ prompt })
      })
      
      const result = await response.json()
      
      if (result.success) {
        this.showNotification(`Image generated in ${(result.processingTime / 1000).toFixed(1)}s!`, 'success')
        
        // Add to generations list
        const newGeneration = {
          id: Date.now(),
          prompt,
          image_url: result.imageUrl,
          processing_time_ms: result.processingTime,
          created_at: new Date().toISOString()
        }
        
        this.state.generations.unshift(newGeneration)
        
        // Clear prompt input
        document.getElementById('promptInput').value = ''
      } else {
        this.showNotification(result.message || 'Image generation failed', 'error')
      }
    } catch (error) {
      console.error('Generation error:', error)
      this.showNotification('Network error. Please try again.', 'error')
    }
    
    this.state.isGenerating = false
    this.render()
  }
  
  async loadGenerationHistory() {
    if (!this.state.token) return
    
    try {
      const response = await fetch('/api/image/history', {
        headers: {
          'Authorization': `Bearer ${this.state.token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        this.state.generations = data.images || []
        this.render()
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }
  
  logout() {
    localStorage.removeItem('token')
    this.state.token = null
    this.state.user = null
    this.state.generations = []
    this.navigate('landing')
  }
  
  render() {
    const app = document.getElementById('app')
    
    let content = ''
    
    // Notification
    if (this.state.error || this.state.success) {
      const isError = !!this.state.error
      const message = this.state.error || this.state.success
      content += `
        <div class="fixed top-4 right-4 z-50 max-w-sm">
          <div class="bg-${isError ? 'red' : 'green'}-100 border border-${isError ? 'red' : 'green'}-400 text-${isError ? 'red' : 'green'}-700 px-4 py-3 rounded shadow-lg">
            <div class="flex">
              <div class="py-1">
                <i class="fas fa-${isError ? 'exclamation-circle' : 'check-circle'} mr-2"></i>
                ${message}
              </div>
              <div class="ml-auto">
                <button onclick="app.state.error = null; app.state.success = null; app.render()" class="text-${isError ? 'red' : 'green'}-700 hover:text-${isError ? 'red' : 'green'}-900">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `
    }
    
    // Page content
    switch (this.state.currentPage) {
      case 'landing':
        content += this.renderLandingPage()
        break
      case 'login':
        content += this.renderLoginPage()
        break
      case 'signup':
        content += this.renderSignupPage()
        break
      case 'payment':
        content += this.renderPaymentPage()
        break
      case 'dashboard':
        content += this.renderDashboard()
        break
      default:
        content += this.renderLandingPage()
    }
    
    app.innerHTML = content
    
    // Set up character counter for prompt input (only on dashboard)
    if (this.state.currentPage === 'dashboard') {
      const promptInput = document.getElementById('promptInput')
      const charCount = document.getElementById('charCount')
      
      if (promptInput && charCount) {
        // Update character count without causing re-render
        const updateCharCount = () => {
          charCount.textContent = promptInput.value.length
        }
        
        // Set initial count
        updateCharCount()
        
        // Add event listeners that don't trigger re-render
        promptInput.addEventListener('input', updateCharCount)
        promptInput.addEventListener('keyup', updateCharCount)
        promptInput.addEventListener('paste', () => {
          setTimeout(updateCharCount, 0) // Allow paste to complete first
        })
      }
    }
    
    // Load generation history when dashboard is rendered
    if (this.state.currentPage === 'dashboard' && this.state.user && this.state.generations.length === 0) {
      this.loadGenerationHistory()
    }
  }
  
  renderLandingPage() {
    return `
      <div class="min-h-screen">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <i class="fas fa-magic text-primary text-2xl mr-2"></i>
                <span class="text-xl font-bold text-gray-900">AI Image Generator</span>
              </div>
              <div class="flex items-center space-x-4">
                <button onclick="app.navigate('login')" class="text-gray-700 hover:text-primary transition-colors">
                  Login
                </button>
                <button onclick="app.navigate('signup')" class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </nav>
        
        <!-- Hero Section -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div class="text-center">
            <h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Generate Amazing
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                AI Images
              </span>
              in Seconds
            </h1>
            <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transform your ideas into stunning visuals with our advanced AI image generator. 
              Simple, fast, and incredibly powerful.
            </p>
            
            <!-- Demo Area -->
            <div class="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto mb-12">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Try the Demo</h3>
              <div class="space-y-4">
                <input 
                  type="text" 
                  placeholder="A beautiful sunset over mountains..."
                  value="A majestic dragon flying over a fantasy castle"
                  readonly
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
                <button 
                  disabled
                  class="w-full bg-gray-400 text-white py-3 px-6 rounded-lg text-lg font-semibold cursor-not-allowed relative"
                >
                  <span class="opacity-50">Generate Image</span>
                  <div class="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center">
                    <span class="text-white font-semibold">Sign up to unlock!</span>
                  </div>
                </button>
              </div>
              
              <!-- Demo Image with Overlay -->
              <div class="mt-6 relative">
                <img 
                  src="https://picsum.photos/400/300?random=demo" 
                  alt="Demo placeholder" 
                  class="w-full rounded-lg opacity-60"
                />
                <div class="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <div class="text-center text-white">
                    <i class="fas fa-lock text-3xl mb-2"></i>
                    <p class="text-lg font-semibold">Sign up and pay $5 to unlock real AI generation!</p>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onclick="app.navigate('signup')"
              class="bg-gradient-to-r from-primary to-secondary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
            >
              Get Started - Only $5 <i class="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        </div>
        
        <!-- Features Section -->
        <div class="bg-gray-50 py-16">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
              <h2 class="text-3xl font-bold text-gray-900 mb-4">Why Choose Our AI Generator?</h2>
              <p class="text-lg text-gray-600">Powerful features that make image generation effortless</p>
            </div>
            
            <div class="grid md:grid-cols-3 gap-8">
              <div class="text-center p-6">
                <div class="bg-primary text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i class="fas fa-bolt"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                <p class="text-gray-600">Generate high-quality images in just 2-3 seconds with our optimized AI models.</p>
              </div>
              
              <div class="text-center p-6">
                <div class="bg-secondary text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i class="fas fa-palette"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">High Quality</h3>
                <p class="text-gray-600">Professional-grade images with stunning detail and artistic flair.</p>
              </div>
              
              <div class="text-center p-6">
                <div class="bg-green-500 text-white w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i class="fas fa-dollar-sign"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">One-Time Payment</h3>
                <p class="text-gray-600">Just $5 for unlimited access. No subscriptions, no hidden fees.</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Pricing Section -->
        <div class="py-16">
          <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-3xl font-bold text-gray-900 mb-8">Simple, Transparent Pricing</h2>
            
            <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
              <div class="text-center">
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Full Access</h3>
                <div class="text-5xl font-bold text-primary mb-2">$5</div>
                <p class="text-gray-600 mb-6">One-time payment</p>
                
                <ul class="text-left space-y-3 mb-8">
                  <li class="flex items-center">
                    <i class="fas fa-check text-green-500 mr-3"></i>
                    Unlimited image generation
                  </li>
                  <li class="flex items-center">
                    <i class="fas fa-check text-green-500 mr-3"></i>
                    High-resolution outputs
                  </li>
                  <li class="flex items-center">
                    <i class="fas fa-check text-green-500 mr-3"></i>
                    Generation history
                  </li>
                  <li class="flex items-center">
                    <i class="fas fa-check text-green-500 mr-3"></i>
                    No monthly fees
                  </li>
                </ul>
                
                <button 
                  onclick="app.navigate('signup')"
                  class="w-full bg-primary text-white py-3 px-6 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Get Started Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }
  
  renderLoginPage() {
    return `
      <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
          <div class="text-center">
            <i class="fas fa-magic text-primary text-4xl mb-4"></i>
            <h2 class="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p class="mt-2 text-gray-600">Sign in to your account</p>
          </div>
          
          <form id="loginForm" onsubmit="event.preventDefault(); app.handleAuth('login')" class="mt-8 space-y-6">
            <div class="space-y-4">
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Enter your password"
                />
              </div>
            </div>
            
            <div>
              <button 
                type="submit" 
                ${this.state.loading ? 'disabled' : ''}
                class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ${this.state.loading ? '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...' : 'Sign in'}
              </button>
            </div>
            
            <div class="text-center">
              <span class="text-gray-600">Don't have an account? </span>
              <button 
                type="button"
                onclick="app.navigate('signup')" 
                class="font-medium text-primary hover:text-indigo-500"
              >
                Sign up
              </button>
            </div>
            
            <div class="text-center">
              <button 
                type="button"
                onclick="app.navigate('landing')" 
                class="text-gray-500 hover:text-gray-700"
              >
                <i class="fas fa-arrow-left mr-1"></i> Back to home
              </button>
            </div>
          </form>
        </div>
      </div>
    `
  }
  
  renderSignupPage() {
    return `
      <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
          <div class="text-center">
            <i class="fas fa-magic text-primary text-4xl mb-4"></i>
            <h2 class="text-3xl font-bold text-gray-900">Create your account</h2>
            <p class="mt-2 text-gray-600">Start generating AI images today</p>
          </div>
          
          <form id="signupForm" onsubmit="event.preventDefault(); app.handleAuth('signup')" class="mt-8 space-y-6">
            <div class="space-y-4">
              <div>
                <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                <input 
                  id="username" 
                  name="username" 
                  type="text" 
                  required 
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Choose a username"
                />
              </div>
              
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  minlength="6"
                  class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Create a password (min 6 characters)"
                />
              </div>
            </div>
            
            <div>
              <button 
                type="submit" 
                ${this.state.loading ? 'disabled' : ''}
                class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ${this.state.loading ? '<i class="fas fa-spinner fa-spin mr-2"></i>Creating account...' : 'Create account'}
              </button>
            </div>
            
            <div class="text-center">
              <span class="text-gray-600">Already have an account? </span>
              <button 
                type="button"
                onclick="app.navigate('login')" 
                class="font-medium text-primary hover:text-indigo-500"
              >
                Sign in
              </button>
            </div>
            
            <div class="text-center">
              <button 
                type="button"
                onclick="app.navigate('landing')" 
                class="text-gray-500 hover:text-gray-700"
              >
                <i class="fas fa-arrow-left mr-1"></i> Back to home
              </button>
            </div>
          </form>
        </div>
      </div>
    `
  }
  
  renderPaymentPage() {
    if (!this.state.user) {
      this.navigate('login')
      return ''
    }
    
    if (this.state.user.paid_status) {
      this.navigate('dashboard')
      return ''
    }
    
    return `
      <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
          <div class="text-center">
            <i class="fas fa-credit-card text-primary text-4xl mb-4"></i>
            <h2 class="text-3xl font-bold text-gray-900">Unlock AI Generation</h2>
            <p class="mt-2 text-gray-600">One-time payment for unlimited access</p>
          </div>
          
          <div class="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
            <div class="text-center mb-8">
              <div class="text-5xl font-bold text-primary mb-2">$5</div>
              <p class="text-gray-600">One-time payment</p>
            </div>
            
            <ul class="space-y-3 mb-8">
              <li class="flex items-center">
                <i class="fas fa-check text-green-500 mr-3"></i>
                <span>Unlimited AI image generation</span>
              </li>
              <li class="flex items-center">
                <i class="fas fa-check text-green-500 mr-3"></i>
                <span>High-resolution outputs (512x512)</span>
              </li>
              <li class="flex items-center">
                <i class="fas fa-check text-green-500 mr-3"></i>
                <span>Generation history & downloads</span>
              </li>
              <li class="flex items-center">
                <i class="fas fa-check text-green-500 mr-3"></i>
                <span>No monthly subscription fees</span>
              </li>
            </ul>
            
            <button 
              onclick="app.handlePayment()"
              ${this.state.loading ? 'disabled' : ''}
              class="w-full bg-gradient-to-r from-primary to-secondary text-white py-4 px-6 rounded-lg text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              ${this.state.loading ? '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...' : '<i class="fas fa-lock mr-2"></i>Pay $5 & Start Generating'}
            </button>
            
            <p class="text-xs text-gray-500 text-center mt-4">
              <i class="fas fa-shield-alt mr-1"></i>
              Secure payment processing (Demo mode - no real charges)
            </p>
          </div>
          
          <div class="text-center">
            <button 
              onclick="app.logout()" 
              class="text-gray-500 hover:text-gray-700"
            >
              <i class="fas fa-sign-out-alt mr-1"></i> Logout
            </button>
          </div>
        </div>
      </div>
    `
  }
  
  renderDashboard() {
    if (!this.state.user) {
      this.navigate('login')
      return ''
    }
    
    if (!this.state.user.paid_status) {
      this.navigate('payment')
      return ''
    }
    
    return `
      <div class="min-h-screen bg-gray-50">
        <!-- Navigation -->
        <nav class="bg-white shadow-sm border-b">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <i class="fas fa-magic text-primary text-2xl mr-2"></i>
                <span class="text-xl font-bold text-gray-900">AI Image Generator</span>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-gray-700">Welcome, ${this.state.user.username}!</span>
                <div class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  <i class="fas fa-check mr-1"></i>Pro Access
                </div>
                <button 
                  onclick="app.logout()" 
                  class="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <i class="fas fa-sign-out-alt mr-1"></i>Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <!-- Generation Interface -->
          <div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Generate AI Images</h2>
            
            <div class="space-y-6">
              <div>
                <label for="promptInput" class="block text-sm font-medium text-gray-700 mb-2">
                  Describe the image you want to create
                </label>
                <textarea
                  id="promptInput"
                  rows="3"
                  maxlength="500"
                  placeholder="A beautiful sunset over mountains, vibrant colors, digital art style..."
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                ></textarea>
                <div class="text-right text-sm text-gray-500 mt-1">
                  <span id="charCount">0</span>/500 characters
                </div>
              </div>
              
              <button 
                onclick="app.generateImage()"
                ${this.state.isGenerating ? 'disabled' : ''}
                class="w-full bg-gradient-to-r from-primary to-secondary text-white py-4 px-6 rounded-lg text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                ${this.state.isGenerating ? 
                  '<i class="fas fa-spinner fa-spin mr-2"></i>Generating Image...' : 
                  '<i class="fas fa-magic mr-2"></i>Generate Image'
                }
              </button>
            </div>
          </div>
          
          <!-- Generation History -->
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Your Generated Images</h2>
            
            ${this.state.generations.length === 0 ? `
              <div class="text-center py-12">
                <i class="fas fa-images text-gray-400 text-5xl mb-4"></i>
                <p class="text-gray-500 text-lg">No images generated yet</p>
                <p class="text-gray-400">Enter a prompt above to create your first AI image!</p>
              </div>
            ` : `
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${this.state.generations.map(gen => `
                  <div class="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <img 
                      src="${gen.image_url}" 
                      alt="Generated image"
                      class="w-full h-48 object-cover rounded-lg mb-3"
                      loading="lazy"
                    />
                    <p class="text-sm text-gray-700 mb-2 line-clamp-2">"${gen.prompt}"</p>
                    <div class="flex justify-between items-center text-xs text-gray-500">
                      <span>
                        <i class="fas fa-clock mr-1"></i>
                        ${(gen.processing_time_ms / 1000).toFixed(1)}s
                      </span>
                      <span>
                        ${new Date(gen.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <a 
                      href="${gen.image_url}" 
                      download="ai-generated-image-${gen.id}.jpg"
                      class="mt-2 inline-flex items-center text-primary hover:text-indigo-700 text-sm"
                    >
                      <i class="fas fa-download mr-1"></i>Download
                    </a>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `
  }
}

// Initialize the application
const app = new AIImageSaaS()

// Expose for global access (for onclick handlers)
window.app = app