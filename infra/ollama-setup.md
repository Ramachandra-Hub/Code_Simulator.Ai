# Ollama Setup (PR-1)

NexusEdge uses **Ollama** as the primary local LLM provider via `OllamaAdapter` → `ModelGateway`.

## Option A — Native install (Windows, recommended for dev)

1. Download: https://ollama.com/download
2. Install and ensure the Ollama app is running (tray icon).
3. Pull models (see commands below).
4. Set `frontend/.env`:

```env
MODEL_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_MODEL_REASONING=deepseek-r1:8b
```

5. Run app locally: `cd frontend && npm run dev`

## Option B — Docker Ollama service

From repo root:

```powershell
docker compose up -d ollama
docker exec nexusedge-ollama ollama pull qwen3:8b
docker exec nexusedge-ollama ollama pull deepseek-r1:8b
```

- Host access: `http://localhost:11434`
- In-container app access: `http://ollama:11434` (already set in `docker-compose.yml` for `frontend` service)

## Verify

```powershell
cd frontend
npm run verify:ollama
curl http://localhost:3000/api/health
```

Expected health fields:

- `model.ollamaReady: true`
- `model.installedModels` includes your pulled models
- `model.modelsReady: true` when both required models are present

## Provider priority (ModelGateway)

When `MODEL_PROVIDER=ollama`:

1. Ollama
2. vLLM
3. OpenAI / Anthropic
4. Heuristic (last resort only)
