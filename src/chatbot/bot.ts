import Anthropic from '@anthropic-ai/sdk';
import { TOOL_DEFINITIONS, TOOL_HANDLERS } from './tools.js';

const SYSTEM_PROMPT = `You are an expert event planning assistant for AutomateEvents, a professional event management platform. You help users create a complete event setup by gathering their requirements conversationally and calling the appropriate API tools in the correct sequence.

The full event creation flow you must follow in order:
1. Event — Collect: event name, guest count, start/end date, daily bar open/close times
2. Bar Setup — Create the physical bar configuration (ask for bar name and style)
3. Item Served — Create at least one signature drink or item (ask what to feature)
4. Menu — Create the event menu
5. Menu Items — Link each item served to the menu with a per-person or per-person-per-hour rate
6. BarCard — Link the event, bar setup, and menu together
7. AutoPreplan — Trigger the execution plan

Guidelines:
- Ask naturally, 1-2 questions at a time
- Suggest professional, elegant names if the user is unsure
- After each successful API call, briefly confirm (1 sentence) then move to the next step
- Keep all created IDs in memory — you will need them for later steps
- If the user wants multiple items served, create each one and add each as a menu item
- Be warm, professional, and concise
- When complete, show a clean summary of all created records with their IDs

Start by greeting the user and asking for the key event details.`;

export interface ReadlineInterface {
  question: (prompt: string) => Promise<string>;
}

export async function runChatbot(rl: ReadlineInterface): Promise<void> {
  const client = new Anthropic();

  const messages: Anthropic.MessageParam[] = [];

  console.log('\n' + '═'.repeat(60));
  console.log('  🍸  AutomateEvents — AI Event Planning Assistant');
  console.log('  Powered by Claude (Anthropic)');
  console.log('═'.repeat(60));
  console.log('  Type your message and press Enter.');
  console.log('  Type "exit" to quit.\n');

  // Initial greeting
  const init = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: "Hello, I'd like to set up a new event." }],
    tools: TOOL_DEFINITIONS as any,
  });
  messages.push({ role: 'user',      content: "Hello, I'd like to set up a new event." });
  messages.push({ role: 'assistant', content: init.content });
  printBlocks(init.content);

  // Main conversation loop
  while (true) {
    const input = await rl.question('\nYou: ');
    if (input.trim().toLowerCase() === 'exit') {
      console.log('\n👋  Goodbye! Your event setup has been saved.\n');
      break;
    }
    if (!input.trim()) continue;

    messages.push({ role: 'user', content: input });

    // Agentic inner loop — keep going until stop_reason is end_turn
    let running = true;
    while (running) {
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
        tools: TOOL_DEFINITIONS as any,
      });

      messages.push({ role: 'assistant', content: resp.content });

      if (resp.stop_reason === 'tool_use') {
        const results: Anthropic.ToolResultBlockParam[] = [];

        for (const block of resp.content) {
          if (block.type !== 'tool_use') continue;
          console.log(`\n  ⚙️  ${block.name}...`);
          try {
            const result = await TOOL_HANDLERS[block.name](block.input);
            console.log(`  ✅  ${result.message}`);
            results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
          } catch (err: any) {
            const msg = String(err?.message ?? err).slice(0, 400);
            console.log(`  ❌  ${block.name} failed: ${msg}`);
            results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: msg }), is_error: true });
          }
        }

        messages.push({ role: 'user', content: results });
      } else {
        printBlocks(resp.content);
        running = false;
      }
    }
  }
}

function printBlocks(blocks: Anthropic.ContentBlock[]): void {
  for (const b of blocks) {
    if (b.type === 'text' && b.text.trim()) {
      console.log('\nAssistant: ' + b.text);
    }
  }
}
