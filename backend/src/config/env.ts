// Load environment variables FIRST, before any other imports
// This file must be imported before any other modules that need environment variables
// Priority (later files override earlier ones):
// 1. .env (base)
// 2. .env.${NODE_ENV} (environment-specific, e.g., .env.production)
// 3. .env.${NODE_ENV}.local (environment-specific local, e.g., .env.production.local)
// 4. .env.local (local overrides - highest priority)
import dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV || 'development';
console.log('nodeEnv:', nodeEnv);
dotenv.config({ quiet: true, path: '.env' });
dotenv.config({ quiet: true, path: `.env.${nodeEnv}` });
dotenv.config({ quiet: true, path: `.env.${nodeEnv}.local` });
dotenv.config({ quiet: true, path: '.env.local' });
