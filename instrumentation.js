import { validateHostedConfig } from './app/runtime-config.mjs';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') validateHostedConfig();
}
