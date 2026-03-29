export function getGmailDeliveryDescription(): string {
  return 'Sends email through the Worker from your connected Gmail account. To, Cc, Bcc, and Subject are edited per topic in the review editor’s Email tab and stored on the sheet when you approve.';
}

export function getGmailDeliveryHint(): string {
  return 'This sidebar only chooses the channel (like picking LinkedIn vs Instagram). Recipient lines are not configured here — open the topic editor, use the Email tab, approve to save, then publish from the queue.';
}
