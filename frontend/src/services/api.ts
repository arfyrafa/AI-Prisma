// Single place where the dashboard talks to FastAPI. The frontend never
// touches the database, and never talks to the AI agent directly.

import type {
  Alert,
  AnalyzeResponse,
  AuditLog,
  ChatMessage,
  ChatResponse,
  Deviation,
  HealthResponse,
  HistoryResponse,
  IngestionResponse,
  Insight,
  KnowledgeDocument,
  KnowledgeDocumentDetail,
  LatestSnapshot,
  Prediction,
  Process,
  ProcessParameter,
  Recommendation,
  TimeRange,
  Verification,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const API = `${BASE_URL}/api`

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** True when the backend reached us but the AI agent itself is down. */
export const isAgentUnavailable = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 503

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const defaultHeaders: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' }

  let response: Response
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...defaultHeaders,
        ...(init?.headers as Record<string, string>),
      },
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke layanan data.', 0)
  }

  if (!response.ok) {
    let detail = `Permintaan gagal (${response.status}).`
    try {
      const body = await response.json()
      if (typeof body?.detail === 'string') detail = body.detail
      else if (Array.isArray(body?.detail) && body.detail[0]?.msg) detail = body.detail[0].msg
    } catch {
      /* response had no JSON body */
    }
    throw new ApiError(detail, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })

const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })

export const api = {
  health: () => request<HealthResponse>('/health'),

  // --- process ---------------------------------------------------------
  listProcesses: () => request<Process[]>('/processes'),
  getLatest: (processId: number) => request<LatestSnapshot>(`/processes/${processId}/latest`),
  getParameters: (processId: number) =>
    request<ProcessParameter[]>(`/processes/${processId}/parameters`),
  updateParameter: (
    processId: number,
    parameterId: number,
    payload: Partial<Pick<ProcessParameter, 'target_value' | 'minimum_value' | 'maximum_value' | 'unit'>>,
  ) => patch<ProcessParameter>(`/processes/${processId}/parameters/${parameterId}`, payload),
  getHistory: (processId: number, range: TimeRange, parameters?: string[]) => {
    const query = new URLSearchParams({ range })
    if (parameters?.length) query.set('parameters', parameters.join(','))
    return request<HistoryResponse>(`/processes/${processId}/history?${query.toString()}`)
  },
  getDeviations: (processId: number) => request<Deviation[]>(`/processes/${processId}/deviations`),

  // --- alerts ----------------------------------------------------------
  listAlerts: (params: {
    processId?: number
    status?: string
    severity?: string
    parameterName?: string
    hours?: number
    limit?: number
  } = {}) => {
    const query = new URLSearchParams()
    if (params.processId) query.set('process_id', String(params.processId))
    if (params.status) query.set('status', params.status)
    if (params.severity) query.set('severity', params.severity)
    if (params.parameterName) query.set('parameter_name', params.parameterName)
    if (params.hours) query.set('hours', String(params.hours))
    if (params.limit) query.set('limit', String(params.limit))
    const suffix = query.toString()
    return request<Alert[]>(`/alerts${suffix ? `?${suffix}` : ''}`)
  },
  acknowledgeAlert: (alertId: number, acknowledgedBy: string, notes?: string) =>
    patch<Alert>(`/alerts/${alertId}/acknowledge`, { acknowledged_by: acknowledgedBy, notes }),

  // --- prediction ------------------------------------------------------
  listPredictions: (processId: number, targetParameter?: string, limit = 30) => {
    const query = new URLSearchParams({ process_id: String(processId), limit: String(limit) })
    if (targetParameter) query.set('target_parameter', targetParameter)
    return request<Prediction[]>(`/predictions?${query.toString()}`)
  },
  generatePrediction: (processId: number, targetParameter: string, horizonMinutes?: number) =>
    post<Prediction>('/predictions/generate', {
      process_id: processId,
      target_parameter: targetParameter,
      horizon_minutes: horizonMinutes,
    }),

  // --- AI --------------------------------------------------------------
  listInsights: (processId: number, limit = 30) =>
    request<Insight[]>(`/insights?process_id=${processId}&limit=${limit}`),
  analyze: (processId: number, requestedBy = 'engineer') =>
    post<AnalyzeResponse>('/insights/analyze', { process_id: processId, requested_by: requestedBy }),

  listRecommendations: (processId: number, status?: string, limit = 30) => {
    const query = new URLSearchParams({ process_id: String(processId), limit: String(limit) })
    if (status) query.set('status', status)
    return request<Recommendation[]>(`/recommendations?${query.toString()}`)
  },
  verifyRecommendation: (
    recommendationId: number,
    payload: { decision: string; notes?: string; verified_by: string; reviewed: boolean },
  ) => post<Verification>(`/recommendations/${recommendationId}/verify`, payload),

  chat: (processId: number, message: string, history: ChatMessage[]) =>
    post<ChatResponse>('/agent/chat', { process_id: processId, message, history }),

  // --- knowledge & audit ------------------------------------------------
  listKnowledge: (query?: string, docType?: string) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (docType) params.set('doc_type', docType)
    const suffix = params.toString()
    return request<KnowledgeDocument[]>(`/knowledge-base${suffix ? `?${suffix}` : ''}`)
  },
  getKnowledgeDocument: (documentId: number) =>
    request<KnowledgeDocumentDetail>(`/knowledge-base/${documentId}`),
  uploadKnowledgeDocument: (formData: FormData) =>
    request<KnowledgeDocumentDetail>('/knowledge-base/upload', {
      method: 'POST',
      body: formData,
    }),
  createKnowledgeDocument: (payload: {
    title: string
    doc_type: string
    reference_code?: string
    version?: string
    summary?: string
    content: string
    tags?: string[]
  }) => post<KnowledgeDocumentDetail>('/knowledge-base', payload),
  deleteKnowledgeDocument: (documentId: number) =>
    request<void>(`/knowledge-base/${documentId}`, { method: 'DELETE' }),

  listAuditLogs: (limit = 120, action?: string) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (action) params.set('action', action)
    return request<AuditLog[]>(`/audit-logs?${params.toString()}`)
  },

  // --- auth & user management ------------------------------------------
  login: (email: string, pass: string) =>
    post<{ token: string; user: any }>('/auth/login', { email, password: pass }),
  listDbUsers: () => request<any[]>('/auth/users'),
  createDbUser: (payload: any) => post<any>('/auth/users', payload),
  updateDbUser: (userId: number | string, payload: any) =>
    patch<any>(`/auth/users/${userId}`, payload),
  deleteDbUser: (userId: number | string) =>
    request<void>(`/auth/users/${userId}`, { method: 'DELETE' }),

  // --- ingestion --------------------------------------------------------
  ingestSensor: (
    processId: number,
    parameters: Record<string, number | null>,
    timestamp?: string,
    source = 'manual_shift_entry',
  ) =>
    post<IngestionResponse>('/ingestion/sensor', {
      process_id: processId,
      parameters,
      timestamp: timestamp || undefined,
      source,
    }),

  ingestBatch: (processId: number, items: Array<Record<string, unknown>>) =>
    post<{ processed_count: number; alerts_created_count: number }>('/ingestion/batch', {
      process_id: processId,
      source: 'csv_upload',
      items,
    }),
}

export const websocketUrl = (): string => {
  if (BASE_URL) {
    return `${BASE_URL.replace(/^http/, 'ws')}/ws`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/ws`
}
