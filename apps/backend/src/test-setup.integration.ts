// ============================================================================
// TAKT — Setup des tests d'intégration backend
// Fichier : apps/backend/src/test-setup.integration.ts
// ============================================================================

// Charge les variables d'environnement de test (jamais de secrets en dur — GG-11)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/takt_test';
}