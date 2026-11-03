export interface Connection {
  id: string
  sourceId: string
  targetId: string
  type: string
  userLabel: string | null
  aiReasoning: string | null
  confirmedByUser: boolean
  createdAt: string
}
