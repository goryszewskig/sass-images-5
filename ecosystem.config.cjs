module.exports = {
  apps: [
    {
      name: 'ai-image-saas',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=ai-image-generator-production --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        JWT_SECRET: 'your-jwt-secret-key-change-in-production',
        STRIPE_SECRET_KEY: 'sk_test_your_stripe_secret_key',
        STRIPE_PUBLISHABLE_KEY: 'pk_test_your_stripe_publishable_key',
        STRIPE_WEBHOOK_SECRET: 'whsec_your_webhook_secret'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}