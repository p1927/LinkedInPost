# Content queue UI — theme notes

This surface (dashboard topic queue: list rows, filters, row actions) follows tokens in `tailwind.config.js` and is **guided by two stacked references**:

1. **ui-ux-pro-max** (`.cursor/skills/ui-ux-pro-max`) — design-system search for product type, color, typography, and the pre-delivery checklist (contrast, focus, hover, no emoji icons).
2. **distill** (`~/.agents/skills/distill`) — **primary rule for this use case**: remove visual noise; one clear hierarchy; **no nested “card in card”**; **no decorative status stripes** on rows; buttons stay **flat, few styles** (filled primary vs light outline/ghost).

## Rules for this feature

- **Cards**: single container — `border-border`, `bg-surface`, modest radius (`rounded-xl`). Avoid `shadow-lift`, rings, and gradient panels unless there is a strong reason.
- **Rows**: topic title + status pill + date + actions in one horizontal rhythm; whitespace separates, not extra chrome.
- **Buttons**: `rounded-lg`, consistent height (`h-8`), `font-medium` (not heavy). Primary actions = `bg-primary`; everything else = `border border-border` + transparent/light background, or text+icon only for delete.
- **Filters**: compact pills; selected state readable but not loud (fill + text contrast).

## Refreshing guidance from ui-ux-pro-max

From the repo root (or path to the skill):

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "SaaS content calendar dashboard queue minimal professional" --design-system
```

Use output for **tokens and checklist**; apply **distill** when implementing the queue so the UI stays simple.
