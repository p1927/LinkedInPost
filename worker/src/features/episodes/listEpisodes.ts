import type { Episode } from './types';
import { EPISODES_HEADERS } from './types';

/** Minimal interface so tests can mock without importing the full SheetsGateway. */
export interface EpisodesSheetReader {
  getEpisodesTab(spreadsheetId: string): Promise<string[][]>;
}

const EPISODES_SHEET = 'Episodes';

function padRow(row: string[], width: number): string[] {
  const padded = [...row];
  while (padded.length < width) padded.push('');
  return padded;
}

function rowToEpisode(cells: string[]): Episode {
  const p = padRow(cells, EPISODES_HEADERS.length);
  return {
    id: p[0].trim(),
    title: p[1].trim(),
    series: p[2].trim(),
    topicArea: p[3].trim(),
    format: p[4].trim(),
    status: p[5].trim(),
    sponsor: p[6].trim(),
    videoUrl: p[7].trim(),
    coverUrl: p[8].trim(),
    carouselUrlsJson: p[9].trim(),
    youtubeUrl: p[10].trim(),
    instagramUrl: p[11].trim(),
    postedAt: p[12].trim(),
    updatedAt: p[13].trim(),
    notes: p[14].trim(),
  };
}

/**
 * Reads the 'Episodes' tab of the user's Google Sheet and returns typed rows.
 * Tolerates a missing tab (returns an empty list + hint to run the video pipeline).
 */
export async function listEpisodes(
  sheets: EpisodesSheetReader,
  spreadsheetId: string,
): Promise<{ episodes: Episode[]; hint?: string }> {
  const rows = await sheets.getEpisodesTab(spreadsheetId);

  if (rows.length === 0) {
    return {
      episodes: [],
      hint: `The '${EPISODES_SHEET}' tab is missing or empty. Run 'python run.py sync' in the video-pipeline directory to populate it.`,
    };
  }

  // First row is the header — skip it (we don't validate it here to stay lenient).
  const dataRows = rows.slice(1);
  const episodes: Episode[] = dataRows
    .map((row) => rowToEpisode(row.map((c) => String(c ?? ''))))
    .filter((ep) => ep.id.length > 0); // skip blank rows

  return { episodes };
}
