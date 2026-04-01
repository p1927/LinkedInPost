import type { EnrichmentModule, ModuleContext, TypographySignal } from '../_shared/types';

const CHANNEL_DEFAULTS: Record<string, TypographySignal> = {
  linkedin: {
    lineBreakStrategy: 'paragraph-break',
    whitespaceRatio: 'airy',
    emojiUsage: 'minimal',
    formattingElements: ['line-break', 'bold'],
    maxLineLength: 70,
    fontWeight: 'normal',
  },
  instagram: {
    lineBreakStrategy: 'rhythm-break',
    whitespaceRatio: 'airy',
    emojiUsage: 'moderate',
    formattingElements: ['line-break', 'emoji'],
    maxLineLength: 50,
    fontWeight: 'normal',
  },
  email: {
    lineBreakStrategy: 'section-break',
    whitespaceRatio: 'scannable',
    emojiUsage: 'minimal',
    formattingElements: ['bold', 'bullet-list', 'divider'],
    maxLineLength: 70,
    fontWeight: 'normal',
  },
  gmail: {
    lineBreakStrategy: 'paragraph-break',
    whitespaceRatio: 'scannable',
    emojiUsage: 'none',
    formattingElements: ['bold', 'bullet-list'],
    maxLineLength: 75,
    fontWeight: 'normal',
  },
  whatsapp: {
    lineBreakStrategy: 'breath-pause',
    whitespaceRatio: 'airy',
    emojiUsage: 'moderate',
    formattingElements: ['line-break', 'emoji', 'bold'],
    maxLineLength: 50,
    fontWeight: 'normal',
  },
  telegram: {
    lineBreakStrategy: 'structured-section',
    whitespaceRatio: 'scannable',
    emojiUsage: 'minimal',
    formattingElements: ['bold', 'bullet-list', 'line-break'],
    maxLineLength: 70,
    fontWeight: 'normal',
  },
};

const FALLBACK_DEFAULT: TypographySignal = {
  lineBreakStrategy: 'paragraph-break',
  whitespaceRatio: 'airy',
  emojiUsage: 'minimal',
  formattingElements: ['line-break'],
  maxLineLength: 70,
  fontWeight: 'normal',
};

function applyPersonaAdjustments(
  signal: TypographySignal,
  personaLanguage: string | undefined,
): TypographySignal {
  if (!personaLanguage) return signal;

  const lang = personaLanguage.toLowerCase();
  const isFormal = lang.includes('formal') || lang.includes('authoritative') || lang.includes('executive');
  const isCasual = lang.includes('casual') || lang.includes('conversational') || lang.includes('friendly');

  if (isFormal) {
    return {
      ...signal,
      emojiUsage: 'none',
      whitespaceRatio: signal.whitespaceRatio === 'airy' ? 'scannable' : signal.whitespaceRatio,
      formattingElements: signal.formattingElements.filter((el) => el !== 'emoji'),
    };
  }

  if (isCasual) {
    const currentLevel = signal.emojiUsage;
    const escalated =
      currentLevel === 'none' ? 'minimal'
      : currentLevel === 'minimal' ? 'moderate'
      : currentLevel;
    const elements = signal.formattingElements.includes('emoji')
      ? signal.formattingElements
      : [...signal.formattingElements, 'emoji'];
    return {
      ...signal,
      emojiUsage: escalated,
      whitespaceRatio: 'airy',
      formattingElements: elements,
    };
  }

  return signal;
}

export const typographyModule: EnrichmentModule<TypographySignal> = {
  name: 'typography',

  async enrich(ctx: ModuleContext): Promise<TypographySignal> {
    const channelKey = ctx.channel.toLowerCase();
    const base = CHANNEL_DEFAULTS[channelKey] ?? FALLBACK_DEFAULT;
    const personaLanguage = ctx.persona?.language;
    return applyPersonaAdjustments(base, personaLanguage);
  },
};
