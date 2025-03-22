{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "thessia.name" -}}
{{- "thessia" }}
{{- end }}

{{/*
Create a default fully qualified app name - simplified to just "thessia"
*/}}
{{- define "thessia.fullname" -}}
{{- "thessia" }}
{{- end }}

{{/*
Create component name - returns the simple component name
*/}}
{{- define "thessia.componentName" -}}
{{- .componentName }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "thessia.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "thessia.labels" -}}
helm.sh/chart: {{ include "thessia.chart" . }}
{{ include "thessia.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "thessia.selectorLabels" -}}
app.kubernetes.io/name: {{ include "thessia.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "thessia.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "thessia.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create ConfigMap environment content
*/}}
{{- define "thessia.configEnvironment" -}}
# Database Configuration
MONGO_URI={{ .Values.global.env.mongoUri }}
REDIS_URI={{ .Values.global.env.redisUri }}
REDIS_PORT={{ .Values.global.env.redisPort }}
REDIS_DB={{ .Values.global.env.redisDb }}
MEILISEARCH_URI={{ .Values.global.env.meilisearchUri }}

# EVE Online API
ESI_URL={{ .Values.global.env.esiUrl }}
ESI_RATE_LIMIT={{ .Values.global.env.esiRateLimit }}

# RedisQ
REDISQ_ID={{ .Values.global.env.redisqId }}
{{- end }}
