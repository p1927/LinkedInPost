import { describe, it, expect, vi } from 'vitest';
import { listEpisodes } from './listEpisodes';
import type { EpisodesSheetReader } from './listEpisodes';

function makeReader(rows: string[][]): EpisodesSheetReader {
  return { getEpisodesTab: vi.fn().mockResolvedValue(rows) };
}

const HEADER_ROW = [
  'id', 'title', 'series', 'topic_area', 'format', 'status', 'sponsor',
  'video_url', 'cover_url', 'carousel_urls_json', 'youtube_url', 'instagram_url',
  'posted_at', 'updated_at', 'notes',
];

describe('listEpisodes', () => {
  it('returns empty episodes list with hint when sheet is empty', async () => {
    const reader = makeReader([]);
    const result = await listEpisodes(reader, 'sheet-id');
    expect(result.episodes).toEqual([]);
    expect(result.hint).toContain('Episodes');
    expect(result.hint).toContain('python run.py sync');
  });

  it('returns empty episodes list with hint when only header row exists', async () => {
    const reader = makeReader([HEADER_ROW]);
    const result = await listEpisodes(reader, 'sheet-id');
    expect(result.episodes).toEqual([]);
    expect(result.hint).toBeUndefined();
  });

  it('parses data rows into Episode objects', async () => {
    const dataRow = [
      'ep-001', 'My First Episode', 'Tech Talk', 'AI', 'interview', 'scripted',
      'Acme Corp', 'https://video.example.com/1', 'https://cover.example.com/1',
      '[]', 'https://youtu.be/abc', 'https://instagram.com/p/abc',
      '2024-01-15', '2024-01-20', 'Good episode',
    ];
    const reader = makeReader([HEADER_ROW, dataRow]);
    const result = await listEpisodes(reader, 'sheet-id');
    expect(result.hint).toBeUndefined();
    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0]).toEqual({
      id: 'ep-001',
      title: 'My First Episode',
      series: 'Tech Talk',
      topicArea: 'AI',
      format: 'interview',
      status: 'scripted',
      sponsor: 'Acme Corp',
      videoUrl: 'https://video.example.com/1',
      coverUrl: 'https://cover.example.com/1',
      carouselUrlsJson: '[]',
      youtubeUrl: 'https://youtu.be/abc',
      instagramUrl: 'https://instagram.com/p/abc',
      postedAt: '2024-01-15',
      updatedAt: '2024-01-20',
      notes: 'Good episode',
    });
  });

  it('pads short rows with empty strings', async () => {
    const shortRow = ['ep-002', 'Short Row']; // only id + title
    const reader = makeReader([HEADER_ROW, shortRow]);
    const result = await listEpisodes(reader, 'sheet-id');
    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0].id).toBe('ep-002');
    expect(result.episodes[0].title).toBe('Short Row');
    expect(result.episodes[0].status).toBe('');
    expect(result.episodes[0].youtubeUrl).toBe('');
  });

  it('filters out rows with no id', async () => {
    const emptyRow = ['', 'No ID'];
    const validRow = ['ep-003', 'Valid', '', '', '', 'posted', '', '', '', '', '', '', '', '', ''];
    const reader = makeReader([HEADER_ROW, emptyRow, validRow]);
    const result = await listEpisodes(reader, 'sheet-id');
    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0].id).toBe('ep-003');
  });

  it('re-throws unexpected Sheets API errors', async () => {
    const reader: EpisodesSheetReader = {
      getEpisodesTab: vi.fn().mockRejectedValue(new Error('Network timeout')),
    };
    await expect(listEpisodes(reader, 'sheet-id')).rejects.toThrow('Network timeout');
  });
});
