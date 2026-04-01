# Search Strategy

## Query Construction Rules

### Rule 1: Subject Before Modifier
Lead with the concrete subject, then add mood or style qualifiers.
- **Good**: `"entrepreneur thinking" professional light`
- **Bad**: `professional light entrepreneur thinking`

### Rule 2: Limit to 3–5 Terms
Search engines and stock libraries perform better with focused queries. More terms add noise, not precision.
- **Good**: `team collaboration whiteboard startup`
- **Bad**: `young diverse team collaborating on whiteboard in modern startup office`

### Rule 3: Avoid Brand Names and Trademarks
Queries referencing specific products, logos, or brands return unusable results due to licensing restrictions.

### Rule 4: Include a Mood or Tone Qualifier
Neutral queries return generic results. A single mood word filters toward emotionally resonant images.
- **Mood Words**: `candid`, `dramatic`, `minimal`, `authentic`, `vibrant`, `calm`, `bold`

### Rule 5: Add a Composition Hint for Portraits
When the image needs a text overlay zone, include a composition cue in the query.
- **Example**: `CEO speaking stage negative space left`

### Rule 6: Specify Orientation When Critical
For carousel covers or hero images, add `vertical` or `horizontal` as appropriate.

---

## Query Templates

### Topic + Emotion
`[topic keyword] [emotion adjective] [style modifier]`
- Example: `remote work burnout candid documentary`

### Person + Action + Context
`[role] [action] [context/setting]`
- Example: `product manager presenting roadmap modern office`

### Concept + Metaphor
`[abstract concept] [metaphor object] [mood]`
- Example: `growth momentum upward arrow minimal`

### Data / Achievement
`[metric type] [visual format] [tone]`
- Example: `quarterly results chart professional clean`

---

## AI Generation Prompt Template

Use this structure when constructing image generation prompts (Midjourney, DALL-E, Stable Diffusion, Firefly):

```
[Subject description], [setting or context], [lighting style], [photographic style or art direction], [mood or atmosphere], [technical specs: aspect ratio, detail level]
```

### Example Prompts

**Documentary style**
> Candid shot of a software engineer reviewing code at a standing desk, natural window light, documentary photography, focused and calm atmosphere, 4:5 aspect ratio, high detail

**Aspirational**
> Professional woman standing at a floor-to-ceiling glass window overlooking city skyline, golden hour light, editorial photography, confident and forward-looking mood, 1:1 aspect ratio

**Conceptual**
> Abstract geometric shapes representing interconnected systems, dark background with glowing blue nodes, digital art direction, futuristic and analytical atmosphere, 16:9 aspect ratio

**Minimal / Negative Space**
> Single chess king piece on white marble surface, overhead shot, product photography, dramatic shadows, minimal and authoritative mood, 1:1 aspect ratio

---

## Fallback Strategy

When image search returns low-quality results:
1. Broaden the primary query by removing the most specific term
2. Try the metaphor template as an alternative framing
3. Default to a conceptual/abstract query using the mood and topic alone
4. If all else fails, use AI generation with the provided prompt template
