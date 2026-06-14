# NexusEdge AI — AWS Production Deployment

## Architecture

```
CloudFront → ALB → ECS/EKS (Next.js app + BullMQ workers)
                    ├── RDS PostgreSQL 16
                    ├── ElastiCache Redis 7
                    ├── Qdrant (EKS or managed)
                    ├── S3 (resumes, audio, exports)
                    └── GPU nodes (vLLM + Whisper + XTTS)
Judge0 cluster (separate ECS service)
OpenTelemetry → CloudWatch / Grafana
```

## Services

| Component | AWS Service | Notes |
|-----------|-------------|-------|
| Next.js App | ECS Fargate / EKS | 2+ replicas, auto-scaling on CPU |
| Workers | ECS Fargate | BullMQ job processors |
| PostgreSQL | RDS PostgreSQL 16 | Multi-AZ, automated backups |
| Redis | ElastiCache Redis 7 | Queue + cache + working memory |
| Qdrant | EKS pod or Qdrant Cloud | Vector search for Digital Twin |
| vLLM | EKS GPU nodes (g5.xlarge+) | DeepSeek / Qwen models |
| Whisper | EKS GPU or SageMaker | Speech-to-text |
| XTTS-v2 | EKS GPU | Text-to-speech |
| Judge0 | ECS (CPU) | Code execution sandbox |
| S3 | S3 + CloudFront | Resume PDFs, audio files |
| Secrets | AWS Secrets Manager | API keys, JWT secrets |

## Environment Variables (Production)

Set via Secrets Manager or ECS task definition:

- `DATABASE_URL` — RDS connection string
- `REDIS_URL` — ElastiCache endpoint
- `QDRANT_URL` — Qdrant service URL
- `VLLM_BASE_URL` — Internal GPU service
- `MODEL_PROVIDER=vllm`
- `JUDGE0_URL` — Judge0 internal URL
- `WHISPER_URL`, `XTTS_URL`
- `NEXTAUTH_SECRET`, `JWT_SECRET`
- `AWS_S3_BUCKET`, `AWS_REGION`

## Deployment Steps

1. Provision VPC with public/private subnets
2. Deploy RDS + ElastiCache + S3
3. Run `prisma migrate deploy` against RDS
4. Build Docker image from `frontend/Dockerfile`
5. Push to ECR, deploy ECS service behind ALB
6. Deploy GPU node group for vLLM/Whisper/XTTS
7. Configure CloudFront for static assets
8. Set up CloudWatch alarms + OpenTelemetry collector

## Scaling

- App: scale on request count / CPU (target 70%)
- Workers: scale on BullMQ queue depth
- vLLM: scale GPU nodes based on inference latency p99
- RDS: read replicas for analytics queries
