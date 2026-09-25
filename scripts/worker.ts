process.env.POSTROOM_WORKER = "1";

import { runBatch } from "../src/lib/worker-cycle";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log("Postroom worker started");
  for (;;) {
    try {
      const sent = await runBatch(5);
      await sleep(sent === 0 ? 2000 : 50);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      await sleep(3000);
    }
  }
}

void main();
