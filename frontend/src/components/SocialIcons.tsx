interface IconProps {
  className?: string;
}

export function YouTubeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <use href="/icons.svg#youtube-icon" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <use href="/icons.svg#instagram-icon" />
    </svg>
  );
}

export function LinkedInIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <use href="/icons.svg#linkedin-icon" />
    </svg>
  );
}
