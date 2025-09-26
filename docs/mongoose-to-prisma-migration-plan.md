# Mongoose to Prisma Migration Plan

## Current Status Assessment

### ✅ Completed
- **Data Migration**: All 17+ models successfully migrated to PostgreSQL
- **Schema Normalization**: Foreign keys, proper types, indexes established
- **Existing Services**: 7 service classes already implemented
  - AllianceService, BattleService, CharacterService, CorporationService, KillmailService, UserService, WarService

### 🔄 In Progress
- **API Endpoints**: 20+ converted, 7 remaining
- **Migration System**: All working, comprehensive status monitoring

### ❌ Remaining Work
- **36 Mongoose imports** across server codebase
- **Missing services** for SDE models and utilities
- **Queue processors** still using Mongoose
- **Helper functions** still using Mongoose
- **Middleware** still using Mongoose

---

## Phase 1: Create Missing Service Classes

### Priority 1: SDE Services (Static Data Export)
**Files Needed**: 1 consolidated service

**Create `server/services/SDEService.ts`**:
- Regions, SolarSystems, Constellations, Celestials
- Factions, Races, Bloodlines
- InvTypes, InvGroups, InvFlags

**Usage Areas**:
- `server/api/solarsystems/[id]/index.get.ts` (6 model imports)
- `server/api/admin/characters/[id]/index.get.ts` (Factions)
- `server/api/stats/item/[id]/market.get.ts` (Regions)
- `server/helpers/Battles.ts` (Regions, SolarSystems)
- `server/helpers/TopLists.ts` (SolarSystems, Constellations)

### Priority 2: Application Services
**Create individual services**:

1. **`ConfigService.ts`**
   - Used in: `server/utils/rateLimit.ts`, `server/plugins/maintenance.ts`

2. **`AccessLogService.ts`**
   - Used in: `server/api/tracking/pageview.post.ts`

3. **`CustomDomainService.ts`**
   - Used in: `server/utils/domainCacheManager.ts`, `server/middleware/domainDetection.ts`

4. **`PriceService.ts`**
   - Used in: `server/helpers/RuntimeCache.ts`

5. **`AchievementService.ts`**
   - Used in: `server/helpers/Achievements.ts`

---

## Phase 2: Convert API Endpoints

### Immediate Priority (7 endpoints)

1. **`server/api/solarsystems/[id]/index.get.ts`**
   - Replace 6 model imports with SDEService
   - High complexity - multiple models

2. **`server/api/tracking/pageview.post.ts`**
   - Replace AccessLogs with AccessLogService
   - Medium complexity - simple logging

3. **`server/api/war/[id].get.ts`**
   - Already uses WarService, just remove Killmails import
   - Low complexity - extend KillmailService

4. **`server/api/admin/characters/[id]/index.get.ts`**
   - Replace Factions with SDEService
   - Low complexity - simple lookup

5. **`server/api/stats/item/[id]/market.get.ts`**
   - Replace Regions with SDEService
   - Low complexity - simple lookup

### Conversion Strategy
- **Maintain exact same API responses**
- **Test each endpoint individually**
- **Use feature flags if needed for gradual rollout**

---

## Phase 3: Convert Server Helpers

### Helper Files (5 files)

1. **`server/helpers/TopLists.ts`** - HIGH PRIORITY
   - Uses Killmails aggregation (complex)
   - Uses Characters, Corporations, Alliances, SolarSystems, Constellations
   - **Strategy**: Extend existing services with aggregation methods

2. **`server/helpers/AdvancedViewHelper.ts`**
   - Uses InvGroups, Killmails
   - **Strategy**: Use SDEService + KillmailService

3. **`server/helpers/Battles.ts`**
   - Uses Killmails, Regions, SolarSystems
   - **Strategy**: Extend BattleService, use SDEService

4. **`server/helpers/Achievements.ts`**
   - Uses CharacterAchievements, Killmails
   - **Strategy**: Create AchievementService

5. **`server/helpers/RuntimeCache.ts`**
   - Uses Prices model
   - **Strategy**: Create PriceService

---

## Phase 4: Convert Middleware & Utils

### Middleware Files (1 file)
1. **`server/middleware/domainDetection.ts`**
   - Uses Alliances, Characters, Corporations, CustomDomains
   - **Strategy**: Use existing services + CustomDomainService

### Utility Files (2 files)
1. **`server/utils/rateLimit.ts`** - Uses Config
2. **`server/utils/domainCacheManager.ts`** - Uses CustomDomains

---

## Phase 5: Convert Queue Processors

### Queue Files (7 files)
1. **`server/queue/Killmail.ts`** - Killmails, KillmailsESI
2. **`server/queue/HistoricalStats.ts`** - CharacterAchievements, Characters, HistoricalStats
3. **`server/queue/Achievement.ts`** - Characters
4. **`server/queue/Campaign.ts`** - Campaigns
5. **`server/queue/Character.ts`** - Corporations
6. **`server/queue/Corporation.ts`** - Alliances
7. **`server/queue/Stats.ts`** - Stats

### Strategy
- **Use existing services where possible**
- **Create batch operation methods in services for queue efficiency**
- **Maintain same queue job interfaces**

---

## Phase 6: Service Enhancements

### Add Missing Methods to Existing Services
1. **KillmailService** - Add aggregation methods for TopLists
2. **CharacterService** - Add bulk operations for queues
3. **CorporationService** - Add bulk operations for queues
4. **AllianceService** - Add bulk operations for queues

### Performance Considerations
- **Batch operations** for queue processors
- **Caching strategies** for frequently accessed SDE data
- **Connection pooling** optimization

---

## Phase 7: Testing & Cleanup

### Testing Strategy
1. **Unit tests** for new services
2. **Integration tests** for converted endpoints
3. **Performance testing** for high-volume operations
4. **Data consistency validation**

### Cleanup Tasks
1. **Remove unused Mongoose model files**
2. **Remove Mongoose dependencies**
3. **Update documentation**
4. **Remove MongoDB connection setup**

---

## Implementation Priority Order

### Week 1: Foundation
1. Create SDEService (highest impact)
2. Create ConfigService, AccessLogService
3. Convert 3 simple API endpoints

### Week 2: Core Helpers
1. Create remaining services (CustomDomainService, PriceService, AchievementService)
2. Convert TopLists.ts (most complex helper)
3. Convert remaining API endpoints

### Week 3: System Integration
1. Convert middleware and utils
2. Convert queue processors
3. Enhance existing services with batch operations

### Week 4: Testing & Cleanup
1. Comprehensive testing
2. Performance optimization
3. Remove Mongoose dependencies
4. Documentation updates

---

## Risk Mitigation

### High Risk Areas
1. **TopLists.ts** - Complex aggregations
2. **Queue processors** - High volume operations
3. **Killmail aggregations** - Performance critical

### Mitigation Strategies
1. **Feature flags** for gradual rollout
2. **Performance monitoring** during transition
3. **Rollback plan** with Mongoose fallback
4. **Comprehensive testing** before full deployment

---

## Success Metrics

### Technical Goals
- [ ] Zero Mongoose imports in server code
- [ ] All API endpoints use Prisma services
- [ ] No performance degradation
- [ ] All tests passing

### Business Goals
- [ ] No API breaking changes
- [ ] Same response times or better
- [ ] Simplified codebase architecture
- [ ] Better type safety with Prisma
