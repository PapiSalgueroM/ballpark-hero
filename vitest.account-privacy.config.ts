import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: process.env.ACCOUNT_PRIVACY_HANDLER
      ? { '../../supabase/functions/account-privacy/handler': process.env.ACCOUNT_PRIVACY_HANDLER }
      : {},
  },
  test: {
    environment: 'node',
    include: ['src/lib/accountPrivacy.test.ts'],
  },
});
