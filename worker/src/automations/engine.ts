import type { AutomationRule, AutomationTrigger } from './types';

export function applyTemplate(template: string, senderName: string): string {
  return template.replace(/\{name\}/g, senderName);
}

export function resolveTemplate(
  rule: AutomationRule,
  trigger: AutomationTrigger,
  senderName: string,
): string | null {
  switch (trigger) {
    case 'comment':
      return rule.comment_reply_template
        ? applyTemplate(rule.comment_reply_template, senderName)
        : null;
    case 'dm':
      return rule.dm_reply_template
        ? applyTemplate(rule.dm_reply_template, senderName)
        : null;
    case 'comment_to_dm':
      return rule.comment_to_dm_template
        ? applyTemplate(rule.comment_to_dm_template, senderName)
        : null;
  }
}

export function shouldFire(rule: AutomationRule, trigger: AutomationTrigger): boolean {
  return rule.enabled && rule.triggers.includes(trigger);
}
