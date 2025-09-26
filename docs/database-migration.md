# MongoDB to PostgreSQL Migration

This document tracks the migration of the legacy MongoDB datasets to PostgreSQL and Prisma. The migration is largely complete with all core data successfully migrated and schema normalized. The remaining work involves converting runtime code from Mongoose to Prisma-based service layer.

## Migration Status Overview (Updated Sept 27, 2025)

### ✅ Phase 1: Data Migration - COMPLETED

- **17+ core models** successfully migrated to PostgreSQL
- **80M+ records** transferred with full validation
- **100% success rate** on all migration scripts
- **Resumable migration system** with progress tracking and error recovery

### ✅ Phase 2: Schema Normalization - COMPLETED

- **Foreign key relationships** properly established
- **Redundant name fields removed** (character_name, corporation_name, etc.)
- **Proper data types** and constraints applied
- **PostgreSQL indexes** optimized for query patterns

### 🔄 Phase 3: Runtime Conversion - PARTIALLY COMPLETE

**Current State**:

- ✅ **8 Service classes** implemented (`server/services/`)
- ✅ **20+ API endpoints** converted to use services
- ⚠️ **10 API endpoints** still using direct Mongoose imports
- ⚠️ **1 endpoint** still directly importing Killmails model

**Services Available**:

- `AllianceService` - Alliance data operations
- `BattleService` - Battle management
- `CharacterService` - Character data access
- `CorporationService` - Corporation operations
- `KillmailService` - Killmail processing
- `UserService` - User management
- `WarService` - War data operations

**Remaining Work**:

- Convert 10 remaining endpoints from `import { Model }` to service layer
- Complete killmails endpoint conversion
- Remove Mongoose model imports once all endpoints converted

### Specific Endpoints Requiring Conversion

**Static Data/SDE Models** (5 endpoints):

- `server/api/stats/item/[id]/market.get.ts` - Uses `Regions` model
- `server/api/admin/characters/[id]/index.get.ts` - Uses `Factions` model
- `server/api/solarsystems/[id]/index.get.ts` - Uses `Celestials`, `Constellations`, `Factions`, `Regions`, `SolarSystems`, `Sovereignty` models

**Application Models** (2 endpoints):

- `server/api/tracking/pageview.post.ts` - Uses `AccessLogs` model
- `server/api/war/[id].get.ts` - Uses `Killmails` model (+ already uses `WarService`)

### Conversion Strategy

#### Phase 1: Create Missing Services

1. **SDEService** - Static data operations (Regions, SolarSystems, Celestials, etc.)
2. **AccessLogService** - Activity tracking and analytics
3. **Extend KillmailService** - Handle war-related killmail queries

#### Phase 2: Convert Endpoints

1. Replace direct model imports with service calls
2. Maintain exact same API response format
3. Test each endpoint for compatibility
4. Update imports and dependencies

#### Phase 3: Cleanup

1. Remove unused Mongoose model files
2. Update TypeScript imports throughout codebase
3. Remove MongoDB connection dependencies

## Current Migration Progress

### ✅ Core Application Datasets

| Model | Records | Status | Migration Command | Validation Command | Typical Duration |
|-------|---------|--------|-------------------|--------------------|------------------|
| Alliances | 17,657 | ✅ Complete | `migrateAlliances` | `validateAlliances` | Seconds |
| Corporations | 966K+ | ✅ Complete | `migrateCorporations` | `validateCorporations` | Minutes |
| Characters | 20.6M+ | ✅ Complete | `migrateCharacters` | `validateCharacters` | Hours |
| Battles | 495K+ | ✅ Complete | `migrateBattles` | `validateBattles` | Minutes |
| Campaigns | ~2K | ✅ Complete | `migrateCampaigns` | `validateCampaigns` | Seconds |
| CharacterAchievements | ~85K | ✅ Complete | `migrateCharacterAchievements` | `validateCharacterAchievements` | Seconds |
| Stats | ~50K | ✅ Complete | `migrateStats` | `validateStats` | Seconds |
| CustomPrices | ~15K | ✅ Complete | `migrateCustomPrices` | `validateCustomPrices` | Seconds |
| Prices | 250M+ | ✅ Complete | `migratePrices` | `validatePrices` | Hours |
| Comments | ~75K | ✅ Complete | `migrateComments` | `validateComments` | Seconds |
| Wars | ~15K | ✅ Complete | `migrateWars` | `validateWars` | Seconds |
| Users | ~12K | ✅ Complete | `migrateUsers` | `validateUsers` | Seconds |
| ApiKeys | ~8K | ✅ Complete | `migrateApiKeys` | `validateApiKeys` | Seconds |
| Config | ~25 | ✅ Complete | `migrateConfig` | `validateConfig` | Instant |
| DScan | ~125K | ✅ Complete | `migrateDScan` | `validateDScan` | Seconds |
| Sovereignty | ~8K | ✅ Complete | `migrateSovereignty` | `validateSovereignty` | Seconds |

### ✅ Static Data Export (SDE)

| Model | Records | Status | Update Command | Notes |
|-------|---------|--------|----------------|-------|
| Regions | 120+ | ✅ Complete | `bin/console updateSDE` | Batch upserts |
| Constellations | 1,000+ | ✅ Complete | `bin/console updateSDE` | Batch upserts |
| SolarSystems | 8,400+ | ✅ Complete | `bin/console updateSDE` | Batch upserts |
| Celestials | 479K+ | ✅ Complete | `bin/console updateSDE` | Batch upserts |
| InvTypes | 45K+ | ✅ Complete | `bin/console updateSDE` | Batch upserts |
| InvGroups | 1,500+ | ✅ Complete | `bin/console updateSDE` | Batch upserts |
| InvFlags | 141+ | ✅ Complete | `bin/console updateSDE` | Batch upserts |
| Races | 10+ | ✅ Complete | `bin/console updateSDE` | Batch upserts |
| Bloodlines | 50+ | ✅ Complete | `bin/console updateSDE` | Batch upserts |
| Factions | 50+ | ✅ Complete | `bin/console updateSDE` | Batch upserts |

**SDE system highlights:** automated downloads from the Fuzzwork SQLite dumps, batch upserts of 100 records, data integrity safeguards, MD5 checksum detection, boolean/numeric conversion helpers, and dependency-aware import ordering.

### 🔥 Pending Mega-Migrations

| Model | Records | Priority | Notes |
|-------|---------|----------|-------|
| Killmails | 80M+ | 🔥 Final phase | Extremely large dataset; migrate last |
| KillmailsESI | 80M+ | 🔥 Final phase | ESI processing store; migrate last |

## Migration Architecture

1. **Prisma schema** (`prisma/schema.prisma`) defines PostgreSQL tables, indexes, and relations.
2. **Migration helpers** (`console/migration/`) provide batch utilities, normalization, and progress logging.
3. **Model-specific scripts** (`console/migrate*.ts`) encapsulate extraction, transform, load (ETL) logic per dataset.
4. **Migration runner** (`console/migrate.ts`) orchestrates individual model migrations with shared CLI flags.
5. **Validation framework** pairs MongoDB and Prisma datasets with sampling to confirm parity on large record sets.

### Prisma Schema Lifecycle

Always run a Prisma migration whenever the schema changes before executing any data migrations:

```bash
# Full command with descriptive name
bunx prisma migrate dev --name descriptive_migration_name

# Simple command (Prisma will prompt for name)
bunx prisma migrate dev
```

**Important**: Always run the Prisma migration **before** running data migrations to ensure tables exist!

Typical scenarios:

- Adding or updating Prisma models or relations
- Adjusting indexes or constraints for performance
- Applying schema optimizations (for example, battle JSON storage changes)
- Switching branches that modify the Prisma schema

Prisma migrations keep the database and code in sync, ensure indexes/constraints exist, and provide an auditable history of structural changes.

## Helper Tooling

### `MigrationHelper` (`console/migration/MigrationHelper.ts`)

- Batch processing for large datasets with progress and ETA reporting
- Uses `estimatedDocumentCount()` for fast source counts
- Offers normalization utilities and duplicate handling with `skipDuplicates`
- Provides guard rails like preflight checks and force flags

### `ValidationHelper` (`console/migration/ValidationHelper.ts`)

- Validates migrations with optional sampling to avoid MongoDB full scans
- Supports custom field mappings and tolerances (for example, date drift)
- Surfaces discrepancies to investigate normalization differences early

## Monitoring and Operations

### PostgreSQL Process Monitor

- Command: `bun run console.ts pgProcessList`
- Live view of queries, PIDs, and durations
- Optional query history panel (last 10 statements)
- Interactive controls (`↑/↓` navigate, `k` kill process, `d/p/u/b` sort keys, `h` history, `r` refresh, `q` quit)
- Helpful for supervising long-running migrations such as Killmails

### Migration Workflow Tips

- Use `bun run console.ts migrate --model <name>` to kick off migrations.
- `bun run console.ts checkMigrationStatus` reports job progress and outstanding tasks.
- Supply `--force` only when reprocessing data that must overwrite existing PostgreSQL rows.
- Validate with the companion `validate<Model>` command before retiring the MongoDB reader.

## Data Transformation Notes

- Normalize sentinel values like `0` or empty strings to `null` where appropriate (for example, alliance `faction_id`).
- Preserve history arrays by moving them into relational tables (for example, character corporation history).
- Ensure numeric precision and boolean conversions are handled consistently between MongoDB and PostgreSQL.

## Next Steps

- Continue porting read paths to Prisma and document each handoff here.
- Plan the Killmails/KillmailsESI migrations with dedicated hardware and monitoring.
- Once a feature is fully Prisma-backed and validated, schedule the removal of its Mongoose model.
