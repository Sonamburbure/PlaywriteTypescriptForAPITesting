import { createInterface } from 'readline';
import dotenv from 'dotenv';
import { runChatbot } from './bot.js';

const envFile = process.env.ENV_FILE ?? '.env.dev';
dotenv.config({ path: envFile });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n❌  ANTHROPIC_API_KEY is not set.');
  console.error('\n   Set it before running:');
  console.error('   $env:ANTHROPIC_API_KEY = "sk-ant-..."\n');
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

process.on('SIGINT', () => {
  console.log('\n\n👋  Interrupted. Goodbye!\n');
  rl.close();
  process.exit(0);
});

function question(prompt: string): Promise<string> {
  return new Promise(resolve => rl.question(prompt, resolve));
}

runChatbot({ question })
  .catch(err => console.error('\n❌  Fatal error:', err?.message ?? err))
  .finally(() => rl.close());
