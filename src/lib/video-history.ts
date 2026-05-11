import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type VideoHistoryItem = {
  model: string;
  queueId: string;
  downloadUrl: string | null;
  createdAt: string;
};

const HISTORY_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(HISTORY_DIR, "venice-video-history.json");

async function ensureHistoryFile() {
  await mkdir(HISTORY_DIR, { recursive: true });

  try {
    await readFile(HISTORY_FILE, "utf8");
  } catch {
    await writeFile(HISTORY_FILE, "[]", "utf8");
  }
}

export async function readVideoHistory() {
  await ensureHistoryFile();

  try {
    const raw = await readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw) as VideoHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendVideoHistory(item: VideoHistoryItem) {
  const history = await readVideoHistory();
  const existingIndex = history.findIndex(
    (entry) => entry.queueId === item.queueId,
  );

  if (existingIndex === -1) {
    history.unshift(item);
  } else {
    history[existingIndex] = item;
  }

  await writeFile(
    HISTORY_FILE,
    JSON.stringify(history.slice(0, 100), null, 2),
    "utf8",
  );
}
