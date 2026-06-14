# NexusEdge Disaster Recovery

## Targets

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | 4 hours |
| RPO (Recovery Point Objective) | 24 hours |

## Database (Supabase / RDS)

### Automated backup
- **Supabase:** Enable daily backups + Point-in-Time Recovery in project settings.
- **RDS:** Multi-AZ + automated snapshots (7–35 day retention).

### Manual backup
```bash
cd frontend
npm run backup:db
# Output: backups/nexusedge-YYYY-MM-DD-HHMMSS.sql
```

### Restore validation
```bash
npm run restore:db -- backups/nexusedge-YYYY-MM-DD-HHMMSS.sql --dry-run
```

### Full restore (staging only)
```bash
npm run restore:db -- backups/nexusedge-YYYY-MM-DD-HHMMSS.sql
```

## Redis (ElastiCache)

- Enable AOF or RDB persistence.
- Cache loss is acceptable (sessions re-auth); queue jobs should use `attempts: 3`.

## Qdrant

- Snapshot volumes: `qdrant snapshot create` via API.
- Re-index from Digital Twin if snapshot lost: run talent index rebuild script.

## Judge0

- Stateless execution; redeploy ECS service from `infra/judge0/docker-compose.judge0.yml`.
- Separate Postgres for Judge0 — include in backup scope.

## Secrets rotation

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # NEXTAUTH_SECRET (must differ)
```

Rotate in AWS Secrets Manager → force ECS service redeploy.

## Incident runbook

1. Check `/api/health` and `/api/health/ready`
2. Review `/api/beta/production` (admin) for error rate spike
3. Roll back ECS task definition to previous revision
4. Restore DB from latest snapshot if data corruption
5. Notify stakeholders; post-mortem within 48h
