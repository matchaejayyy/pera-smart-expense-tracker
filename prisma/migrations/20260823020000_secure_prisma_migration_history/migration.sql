-- Prisma's migration history is internal server metadata and must never be
-- readable or writable through Supabase's public Data API roles.
REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon, authenticated, service_role;

-- Keep Prisma working as the table owner while denying every Data API role.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Future Prisma-created tables start private. Any table intended for the Data
-- API must receive explicit grants and RLS policies in its own migration.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;
