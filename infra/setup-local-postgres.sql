-- NexusEdge local PostgreSQL setup (run as postgres superuser)
-- Example: psql -U postgres -f setup-local-postgres.sql

CREATE USER nexusedge WITH PASSWORD 'nexusedge_secret';
CREATE DATABASE nexusedge OWNER nexusedge;
GRANT ALL PRIVILEGES ON DATABASE nexusedge TO nexusedge;

\c nexusedge
GRANT ALL ON SCHEMA public TO nexusedge;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nexusedge;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nexusedge;
