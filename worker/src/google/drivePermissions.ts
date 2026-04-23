/**
 * Grants editor access to a Google Drive file using the caller's OAuth access token.
 * Used during sheet onboarding so the service account can read/write the tenant's sheet.
 */
export async function shareFileWithUser(
  fileId: string,
  userAccessToken: string,
  emailAddress: string,
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'writer', type: 'user', emailAddress }),
    },
  );
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(
      `Drive permission grant failed (${res.status}): ${msg.slice(0, 300)}`,
    );
  }
}
