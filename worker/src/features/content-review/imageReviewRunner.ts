import type { WorkerEnvForLlm } from '../../llm/types';
import type { LlmRef } from '../../llm/types';
import { generateMultimodalForRef } from '../../llm/gateway';
import { buildImageMultimodalPrompt } from './prompts/imageMultimodal';
import type { ImageReviewResult, ContentReviewVerdict } from './types';

function parseImageReviewJson(raw: string, imageUrl: string): ImageReviewResult {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      imageUrl,
      visibleText: String(parsed.visibleText || ''),
      keyElements: String(parsed.keyElements || ''),
      meaning: String(parsed.meaning || ''),
      relevant: Boolean(parsed.relevant),
      verdict: (['pass', 'flag', 'block'].includes(String(parsed.verdict))
        ? String(parsed.verdict)
        : 'flag') as ContentReviewVerdict,
    };
  } catch {
    return {
      imageUrl,
      visibleText: '',
      keyElements: '',
      meaning: 'Could not parse image review response.',
      relevant: false,
      verdict: 'flag',
    };
  }
}

export async function runImageReview(
  env: WorkerEnvForLlm,
  ref: LlmRef,
  imageUrls: string[],
  topic: string,
  postText: string,
  channel: string,
): Promise<ImageReviewResult[]> {
  const results: ImageReviewResult[] = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i]!;
    try {
      const imgResponse = await fetch(url);
      if (!imgResponse.ok) {
        results.push({
          imageUrl: url,
          visibleText: '',
          keyElements: '',
          meaning: `Could not fetch image (status ${imgResponse.status}).`,
          relevant: false,
          verdict: 'flag',
        });
        continue;
      }
      const arrayBuffer = await imgResponse.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let b = 0; b < uint8.length; b++) {
        binary += String.fromCharCode(uint8[b]!);
      }
      const base64 = btoa(binary);
      const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
      const mimeType = contentType.split(';')[0]?.trim() || 'image/jpeg';

      const prompt = buildImageMultimodalPrompt({ topic, postText, channel, imageIndex: i });
      const { text: raw } = await generateMultimodalForRef(env, ref, { mimeType, data: base64 }, prompt);
      results.push(parseImageReviewJson(raw, url));
    } catch (err) {
      results.push({
        imageUrl: url,
        visibleText: '',
        keyElements: '',
        meaning: `Image review failed: ${err instanceof Error ? err.message : String(err)}`,
        relevant: false,
        verdict: 'flag',
      });
    }
  }
  return results;
}
