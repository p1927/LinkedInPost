export interface ArticleAnalysis {
  summary: string
  whyItMatters: string
  postAngles: string[]
  opposingView: string
  opinionPrompt: string
  perspectiveFlip: {
    founder: string
    expert: string
    beginner: string
  }
}

// Interest Groups
export interface InterestGroup {
  id: string
  name: string
  topics: string[]
  domains: string[]
  color: string
  createdAt: string
  updatedAt: string
}

export interface CreateInterestGroupPayload {
  name: string
  topics: string[]
  domains: string[]
  color: string
}

export interface UpdateInterestGroupPayload {
  id: string
  name?: string
  topics?: string[]
  domains?: string[]
  color?: string
}

// Clips
export interface ClipVersion {
  text: string
  editedAt: string
}

export type ClipType = 'article' | 'passage'

export interface Clip {
  id: string
  type: ClipType
  articleTitle: string
  articleUrl: string
  source: string
  publishedAt: string
  thumbnailUrl: string
  passageText: string
  clippedAt: string
  versions: ClipVersion[]
  assignedPostIds: string[]
}

export interface CreateClipPayload {
  type: ClipType
  articleTitle: string
  articleUrl: string
  source?: string
  publishedAt?: string
  thumbnailUrl?: string
  passageText?: string
}

export interface UpdateClipPayload {
  id: string
  passageText?: string
}

export interface ClipClusterResult {
  themes: { name: string; indices: number[] }[]
  support: number[]
  challenge: number[]
}
