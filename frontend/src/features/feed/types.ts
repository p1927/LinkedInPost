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

export interface DraftConnection {
  topicId: string
  topic: string
  reason: string
}

export interface DraftConnectionsResult {
  connections: DraftConnection[]
}

export interface DebateArticle {
  title: string
  summary: string
  source: string
  opposingAngle: string
  keyArguments: string[]
}

export interface CrossDomainInsight {
  domain: string
  connection: string
  postAngle: string
}

export interface CrossDomainResult {
  insights: CrossDomainInsight[]
}

export interface OpinionLeaderInsight {
  name: string
  role: string
  perspective: string
  postAngle: string
}

export interface OpinionLeadersResult {
  leaders: OpinionLeaderInsight[]
}
