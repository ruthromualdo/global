import fs from 'node:fs';
import readline from 'node:readline';

const fileStream = fs.createReadStream('C:/Users/ruthc/.gemini/antigravity/brain/07905d2d-b883-48ba-82f0-6b559ad34894/.system_generated/logs/transcript_full.jsonl');
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

for await (const line of rl) {
  if (line.includes('"step_index":689')) {
    const data = JSON.parse(line);
    console.log(data.content);
    break;
  }
}
