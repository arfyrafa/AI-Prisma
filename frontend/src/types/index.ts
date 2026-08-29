// Mirrors the Pydantic schemas in backend/app/schemas/__init__.py.
// Keep both sides in sync when the API contract changes.

export type Severity = 'INFO' | 'WARNING' | 'CRITICAL'
export type ParameterStatus = 'normal' | 'warning' | 'critical' | 'no_data'
export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d'

export interface HealthResponse {
  status: string
  database: string
  agent_provider: string
  agent_available: boolean
  predictive_provider: string
  simulation_mode: boolean
  server_time: string
}

export interface Process {
  id: number
  name: string
  description: string | null
  status: string
  data_source: string
}

export interface ProcessParameter {
  id: number
  parameter_name: string
  display_name: string
  unit: string
  target_value: number | null
  minimum_value: number | null
  maximum_value: number | null
  display_order: number
}

export interface SensorReading {
  id: number
  process_id: number
  timestamp: string
  clo2_concentration: number | null
  temperature: number | null
  pressure: number | null
  ph: number | null
  flow_rate: number | null
  so2_dosage: number | null
  orp: number | null
  turbidity: number | null
  source: string
}

export interface ParameterSnapshot {
  id?: number
  parameter_name: string
  display_name: string
  unit: string
  current_value: number | null
  target_value: number | null
  minimum_value: number | null
  maximum_value: number | null
  deviation: number | null
  status: ParameterStatus
  status_label: string
  last_updated: string | null
}

export interface LatestSnapshot {
  process: Process
  reading: SensorReading | null
  parameters: ParameterSnapshot[]
  overall_status: ParameterStatus
  active_alert_count: number
  data_source: string
  server_time: string
}

export interface HistoryPoint {
  timestamp: string
  values: Record<string, number | null>
}

export interface HistoryResponse {
  process_id: number
  range: string
  parameters: string[]
  points: HistoryPoint[]
}

export interface Deviation {
  parameter_name: string
  display_name: string
  unit: string
  current_value: number
  expected_min: number | null
  expected_max: number | null
  deviation: number
  severity: Severity
  detected_at: string
  message: string
}

export interface Alert {
  id: number
  process_id: number
  parameter_name: string
  severity: Severity
  message: string
  current_value: number | null
  expected_min: number | null
  expected_max: number | null
  deviation: number | null
  status: string
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  created_at: string
}

export interface Prediction {
  id: number
  process_id: number
  timestamp: string
  target_parameter: string
  actual_value: number | null
  predicted_value: number | null
  unit: string
  model_name: string
  model_metadata: Record<string, unknown> | null
  prediction_horizon: number
  is_simulated: boolean
  created_at: string
}

export interface Insight {
  id: number
  process_id: number
  timestamp: string
  summary: string
  details: string | null
  related_parameters: string[] | null
  source: string
  confidence: number | null
  created_at: string
}

export interface Verification {
  id: number
  recommendation_id: number
  decision: string
  notes: string | null
  verified_by: string
  verified_at: string
}

export interface Recommendation {
  id: number
  process_id: number
  insight_id: number | null
  recommendation: string
  reason: string | null
  suggested_action: string | null
  related_parameters: string[] | null
  source: string
  status: string
  created_at: string
  verifications: Verification[]
}

export interface AnalyzeResponse {
  insight: Insight
  recommendations: Recommendation[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  reply: string
  source: string
  related_parameters: string[] | null
  timestamp: string
  latency_ms?: number
}

export interface KnowledgeDocument {
  id: number
  title: string
  doc_type: string
  reference_code: string | null
  version: string | null
  summary: string | null
  tags: string[] | null
  updated_at: string
}

export interface KnowledgeDocumentDetail extends KnowledgeDocument {
  content: string | null
}

export interface AuditLog {
  id: number
  user_id: string | null
  action: string
  entity_type: string | null
  entity_id: number | null
  description: string | null
  log_metadata: Record<string, unknown> | null
  created_at: string
}

export interface ReadingEventPayload {
  reading: SensorReading
  deviations: Deviation[]
  alerts: Alert[]
  phase: string
}
