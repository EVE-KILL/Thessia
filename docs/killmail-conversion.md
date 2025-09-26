# Killmail Schema Conversion Plan

## Status: ✅ Schema Implementation Complete

**✅ Prisma Schema Added**: 4 normalized killmail tables added to `prisma/schema.prisma`
**✅ Database Migration**: `20250927142402_create_killmail_tables` successfully applied
**✅ Reverse Relations**: All reference tables updated with reverse killmail relations

**Next Steps**:
- [ ] Rewrite KillmailService for normalized schema
- [ ] Create data migration script from MongoDB to PostgreSQL
- [ ] Update API endpoints to use normalized schema
- [ ] Performance testing and optimization

## Overview

This document outlines the conversion plan for merging the `Killmails` and `KillmailsESI` MongoDB collections into a normalized set of 4 PostgreSQL tables using Prisma.

## Current State Analysis

### 1. Killmails Collection (Processed/Enriched Data)
- **Purpose**: Stores fully processed killmails with enriched metadata
- **Size**: ~800M+ records
- **Schema**: Complex nested structure with denormalized entity names

**Key Features:**
- Enriched with localized names, translations
- Calculated values (total_value, fitting_value, ship_value)
- Spatial coordinates (x, y, z) and location metadata
- Complex nested structures (attackers[], items[], victim{})
- Extensive indexing for query optimization (30+ indexes)
- Entity involvement tracking (character, corp, alliance)

### 2. KillmailsESI Collection (Raw ESI Data)
- **Purpose**: Stores raw killmail data from ESI for processing queue
- **Size**: Smaller, temporary storage
- **Schema**: Minimal ESI-compliant structure

**Key Features:**
- Raw ESI data structure
- Processing queue management (processed, delayedUntil flags)
- Minimal enrichment
- Temporary staging before processing into Killmails

## Proposed Solution: Normalized Table Structure

### Core Principle
Split killmail data into four normalized tables with proper foreign key relationships:
1. **Killmail** - Core killmail metadata and processing state
2. **KillmailVictim** - Victim entity and ship data (1:1 with killmail)
3. **KillmailAttacker** - Attacker entities and damage data (1:many with killmail)
4. **KillmailItem** - Item drops and destruction data (1:many with killmail, hierarchical)

### Benefits of Normalized Approach
- **Data Integrity**: Foreign key constraints ensure consistency
- **Storage Efficiency**: No duplicate entity data across killmails
- **Query Flexibility**: Can analyze attackers, victims, items independently
- **Scalability**: Each table optimized separately
- **Maintainability**: Clean separation of concerns
- **Extensibility**: Easy to add new fields without affecting other tables

### Schema Design

```prisma
// Core killmail data and metadata
model Killmail {
    id                      Int       @id @default(autoincrement())
    killmail_id             Int       @unique
    killmail_hash           String
    killmail_time           DateTime
    solar_system_id         Int

    // Location data (foreign key references)
    constellation_id        Int?
    region_id               Int?

    // Calculated values (enriched during processing)
    total_value             Decimal?  @db.Decimal(20, 2)
    fitting_value           Decimal?  @db.Decimal(20, 2)
    ship_value              Decimal?  @db.Decimal(20, 2)

    // Processing status
    processed               Boolean   @default(false)
    delayed_until           DateTime?
    processing_error        String?

    // Additional metadata
    is_npc                  Boolean   @default(false)
    is_solo                 Boolean   @default(false)
    war_id                  Int?
    dna                     String?
    near                    String?

    // Timestamps
    created_at              DateTime  @default(now())
    updated_at              DateTime  @updatedAt

    // Relations to reference tables
    solar_system            SolarSystem?  @relation("KillmailSolarSystem", fields: [solar_system_id], references: [system_id])
    constellation           Constellation? @relation("KillmailConstellation", fields: [constellation_id], references: [constellation_id])
    region                  Region?       @relation("KillmailRegion", fields: [region_id], references: [region_id])
    war                     War?          @relation("KillmailWar", fields: [war_id], references: [war_id])

    // Relations to killmail components
    victim                  KillmailVictim?
    attackers               KillmailAttacker[]
    items                   KillmailItem[]

    // Indexes for core queries
    @@index([killmail_time])
    @@index([processed])
    @@index([solar_system_id, killmail_time])
    @@index([region_id, killmail_time])
    @@index([constellation_id, killmail_time])
    @@index([is_npc, killmail_time])
    @@index([is_solo, killmail_time])
    @@index([total_value, killmail_time])
    @@index([war_id, killmail_time])
    @@index([delayed_until, processed])

    @@map("killmails")
}

// Victim data (1:1 with killmail)
model KillmailVictim {
    id                      Int       @id @default(autoincrement())
    killmail_id             Int       @unique

    // Entity references (foreign keys to existing tables)
    character_id            Int?
    corporation_id          Int?
    alliance_id             Int?
    faction_id              Int?

    // Ship data
    ship_type_id            Int
    ship_group_id           Int?
    damage_taken            Int

    // Position coordinates
    x                       Float?
    y                       Float?
    z                       Float?

    // Relations to reference tables
    character               Character?    @relation("KillmailVictimCharacter", fields: [character_id], references: [character_id])
    corporation             Corporation?  @relation("KillmailVictimCorporation", fields: [corporation_id], references: [corporation_id])
    alliance                Alliance?     @relation("KillmailVictimAlliance", fields: [alliance_id], references: [alliance_id])
    faction                 Faction?      @relation("KillmailVictimFaction", fields: [faction_id], references: [faction_id])
    ship_type               InvType       @relation("KillmailVictimShipType", fields: [ship_type_id], references: [type_id])
    ship_group              InvGroup?     @relation("KillmailVictimShipGroup", fields: [ship_group_id], references: [group_id])

    // Relation back to killmail
    killmail                Killmail      @relation(fields: [killmail_id], references: [killmail_id], onDelete: Cascade)

    // Indexes for entity queries
    @@index([character_id])
    @@index([corporation_id])
    @@index([alliance_id])
    @@index([faction_id])
    @@index([ship_type_id])
    @@index([ship_group_id])

    @@map("killmail_victims")
}

// Attacker data (1:many with killmail)
model KillmailAttacker {
    id                      Int       @id @default(autoincrement())
    killmail_id             Int

    // Entity references (foreign keys to existing tables)
    character_id            Int?
    corporation_id          Int?
    alliance_id             Int?
    faction_id              Int?

    // Ship and weapon data
    ship_type_id            Int?
    ship_group_id           Int?
    weapon_type_id          Int?

    // Attack data
    damage_done             Int
    final_blow              Boolean   @default(false)
    security_status         Float?

    // Relations to reference tables
    character               Character?    @relation("KillmailAttackerCharacter", fields: [character_id], references: [character_id])
    corporation             Corporation?  @relation("KillmailAttackerCorporation", fields: [corporation_id], references: [corporation_id])
    alliance                Alliance?     @relation("KillmailAttackerAlliance", fields: [alliance_id], references: [alliance_id])
    faction                 Faction?      @relation("KillmailAttackerFaction", fields: [faction_id], references: [faction_id])
    ship_type               InvType?      @relation("KillmailAttackerShipType", fields: [ship_type_id], references: [type_id])
    ship_group              InvGroup?     @relation("KillmailAttackerShipGroup", fields: [ship_group_id], references: [group_id])
    weapon_type             InvType?      @relation("KillmailAttackerWeaponType", fields: [weapon_type_id], references: [type_id])

    // Relation back to killmail
    killmail                Killmail      @relation(fields: [killmail_id], references: [killmail_id], onDelete: Cascade)

    // Indexes for entity and damage queries
    @@index([killmail_id])
    @@index([character_id])
    @@index([corporation_id])
    @@index([alliance_id])
    @@index([faction_id])
    @@index([ship_type_id])
    @@index([ship_group_id])
    @@index([weapon_type_id])
    @@index([final_blow])
    @@index([damage_done])

    @@map("killmail_attackers")
}

// Item data (1:many with killmail, hierarchical for nested items)
model KillmailItem {
    id                      Int       @id @default(autoincrement())
    killmail_id             Int
    parent_item_id          Int?      // Self-referencing for nested items

    // Item references (foreign keys to existing tables)
    item_type_id            Int
    group_id                Int?
    category_id             Int?
    flag                    Int
    singleton               Int
    quantity_destroyed      Int       @default(0)
    quantity_dropped        Int       @default(0)
    value                   Decimal?  @db.Decimal(15, 2)

    // Relations to reference tables
    item_type               InvType       @relation("KillmailItemType", fields: [item_type_id], references: [type_id])
    group                   InvGroup?     @relation("KillmailItemGroup", fields: [group_id], references: [group_id])

    // Relations for hierarchy and killmail
    killmail                Killmail      @relation(fields: [killmail_id], references: [killmail_id], onDelete: Cascade)
    parent_item             KillmailItem? @relation("ItemHierarchy", fields: [parent_item_id], references: [id])
    child_items             KillmailItem[] @relation("ItemHierarchy")

    // Indexes for item queries
    @@index([killmail_id])
    @@index([item_type_id])
    @@index([group_id])
    @@index([category_id])
    @@index([parent_item_id])
    @@index([flag])

    @@map("killmail_items")
}
```

## Migration Strategy

### Phase 1: Schema Creation & Service Development

1. **Create Prisma models** for all four tables with proper relationships
2. **Update KillmailService** to handle normalized structure:
   - `findByIdWithFull()` - Returns complete ESI format via joins
   - `findByIdBasic()` - Returns only core killmail data
   - `toESIFormat()` - Reconstructs ESI JSON from normalized data
   - `createFromESI()` - Inserts ESI data into normalized tables
   - `enrichKillmail()` - Updates calculated values and metadata
3. **Implement processing lifecycle methods** for queue management

### Phase 2: Data Migration

1. **Migrate KillmailsESI** (raw/unprocessed records)
   - Split ESI data into four normalized tables
   - Set `processed = false` in killmail table
   - Handle missing enriched data gracefully

2. **Migrate Killmails** (processed records)
   - Extract victim data into KillmailVictim table
   - Extract attackers array into KillmailAttacker table
   - Extract items array into KillmailItem table (with hierarchy)
   - Preserve all enriched metadata
   - Set `processed = true` in killmail table

### Phase 3: Processing Logic Update

1. **Update queue processors** to work with normalized tables
2. **Implement enrichment pipeline** that updates related tables
3. **Update API endpoints** to use new service reconstruction methods

## Key Design Decisions

### 1. Normalization Strategy

- **Core data** in Killmail table: processing state, location, calculated values
- **Entity relationships** in separate tables: proper foreign keys, no duplication
- **Hierarchical items** via self-referencing foreign key in KillmailItem
- **Translation objects** preserved as JSON for localization support

### 2. Processing Lifecycle

```text
Raw ESI → Split into tables → Enrichment → Processed Killmail
[processed=false]  →  [enrichment]  →  [processed=true]
```

### 3. Service Layer Reconstruction

The KillmailService will provide methods to reconstruct ESI format:

```typescript
// Reconstruct full ESI format
async findByIdWithFull(killmailId: number): Promise<ESIKillmail> {
    const [killmail, victim, attackers, items] = await Promise.all([
        this.findById(killmailId),
        this.findVictim(killmailId),
        this.findAttackers(killmailId),
        this.findItems(killmailId)
    ]);

    return this.toESIFormat(killmail, victim, attackers, items);
}
```

### Required Updates to Existing Tables

The following existing Prisma models will need reverse relation additions:

```prisma
// Add to Character model
model Character {
    // ... existing fields ...

    // New killmail relations
    victim_killmails    KillmailVictim[]    @relation("KillmailVictimCharacter")
    attacker_killmails  KillmailAttacker[]  @relation("KillmailAttackerCharacter")
}

// Add to Corporation model
model Corporation {
    // ... existing fields ...

    // New killmail relations
    victim_killmails    KillmailVictim[]    @relation("KillmailVictimCorporation")
    attacker_killmails  KillmailAttacker[]  @relation("KillmailAttackerCorporation")
}

// Add to Alliance model
model Alliance {
    // ... existing fields ...

    // New killmail relations
    victim_killmails    KillmailVictim[]    @relation("KillmailVictimAlliance")
    attacker_killmails  KillmailAttacker[]  @relation("KillmailAttackerAlliance")
}

// Add to Faction model
model Faction {
    // ... existing fields ...

    // New killmail relations
    victim_killmails    KillmailVictim[]    @relation("KillmailVictimFaction")
    attacker_killmails  KillmailAttacker[]  @relation("KillmailAttackerFaction")
}

// Add to SolarSystem model
model SolarSystem {
    // ... existing fields ...

    // New killmail relations
    killmails           Killmail[]          @relation("KillmailSolarSystem")
}

// Add to Region model
model Region {
    // ... existing fields ...

    // New killmail relations
    killmails           Killmail[]          @relation("KillmailRegion")
}

// Add to Constellation model
model Constellation {
    // ... existing fields ...

    // New killmail relations
    killmails           Killmail[]          @relation("KillmailConstellation")
}

// Add to InvType model
model InvType {
    // ... existing fields ...

    // New killmail relations
    victim_ships        KillmailVictim[]    @relation("KillmailVictimShipType")
    attacker_ships      KillmailAttacker[]  @relation("KillmailAttackerShipType")
    attacker_weapons    KillmailAttacker[]  @relation("KillmailAttackerWeaponType")
    killmail_items      KillmailItem[]      @relation("KillmailItemType")
}

// Add to InvGroup model
model InvGroup {
    // ... existing fields ...

    // New killmail relations
    victim_ship_groups    KillmailVictim[]    @relation("KillmailVictimShipGroup")
    attacker_ship_groups  KillmailAttacker[]  @relation("KillmailAttackerShipGroup")
    killmail_item_groups  KillmailItem[]      @relation("KillmailItemGroup")
}

// Add to War model (if exists)
model War {
    // ... existing fields ...

    // New killmail relations
    killmails           Killmail[]          @relation("KillmailWar")
}
```

### 4. Field Mapping

| Current Mongoose | New Prisma | Notes |
|-----------------|------------|-------|
| `kill_time` | `killmail_time` | Standardized to ESI naming |
| `system_id` | `solar_system_id` | ESI standard |
| `victim.character_id` | `victim_character_id` | Denormalized |
| `attackers[]` | `attackers` (JSON) + denormalized main | Hybrid approach |
| `region_name` (translation) | `region_name` (JSON) | Preserved structure |

## Implementation Steps

### Step 1: Create Migration
```sql
-- Create new unified killmail table with indexes
-- (Generated by Prisma migrate)
```

### Step 2: Data Migration Script
```typescript
// console/migrateKillmails.ts
// - Migrate KillmailsESI records (raw)
// - Migrate Killmails records (processed)
// - Handle deduplication by killmail_id + killmail_hash
```

### Step 3: Service Updates
```typescript
// KillmailService methods:
// - findUnprocessed() -> for queue processing
// - markAsProcessed(id) -> lifecycle management
// - enrichKillmail(data) -> processing pipeline
// - All existing query methods work on unified table
```

### Step 4: Queue Processing Updates
```typescript
// Update processors to:
// - Query unprocessed killmails
// - Enrich in-place
// - Mark as processed
```

## Enhanced Benefits with Foreign Key References

1. **Data Integrity**: Foreign key constraints ensure referential integrity between tables
2. **Storage Efficiency**: Eliminates duplicate entity data and name storage across killmails
3. **Real-time Data Access**: Names and metadata retrieved from authoritative source tables (Character, Corporation, Alliance, etc.)
4. **Query Flexibility**: Can analyze victims, attackers, items independently without full killmail joins
5. **Performance Optimization**: Each table indexed optimally for its specific queries
6. **Maintainability**: Clean separation of concerns makes code easier to understand and maintain
7. **Extensibility**: Easy to add new fields or relationships without affecting other tables
8. **Analytical Power**: Direct queries on attacker patterns, item analysis, victim statistics
9. **Data Consistency**: Entity updates automatically reflected in killmail queries via joins
10. **Service Layer Control**: Complete control over ESI format reconstruction when needed

### Key Foreign Key Benefits

- **Character/Corporation/Alliance**: Always get current names and metadata from authoritative tables
- **Solar System/Region/Constellation**: Location data with security status, names from SDE tables
- **Ship/Weapon Types**: Item metadata with multilingual names from InvType table
- **Item Groups**: Category and group information for advanced item analysis
- **Faction Data**: Faction affiliations with complete faction metadata

## Potential Challenges & Solutions

### Challenge 1: Join Performance for Full Killmail Reconstruction

- **Solution**: Service-level caching of frequently accessed killmails
- **Mitigation**: Proper indexing and consider materialized views for heavy analytical queries
- **Strategy**: Most API endpoints only need partial data, not full ESI reconstruction

### Challenge 2: Large Migration Volume

- **Solution**: Implement streaming migration with batching (1M records at a time)
- **Monitoring**: Progress tracking and error handling with rollback capability

### Challenge 3: Service Complexity

- **Solution**: Well-designed service methods with clear separation of concerns
- **Testing**: Comprehensive unit tests for reconstruction logic
- **Documentation**: Clear examples of service usage patterns

### Challenge 4: API Compatibility During Migration

- **Solution**: KillmailService maintains existing method signatures
- **Strategy**: Gradual endpoint migration with parallel testing
- **Fallback**: Keep old collections during transition period for verification

## Timeline Estimate

- **Schema Design & Review**: 1 day
- **Service Implementation**: 2 days
- **Migration Script Development**: 2 days
- **Testing & Validation**: 2 days
- **Production Migration**: 1 day (staged)
- **Total**: ~1 week

## Success Criteria

1. **Data Integrity**: 100% of records migrated successfully across all four tables
2. **Referential Integrity**: All foreign key relationships maintained correctly
3. **Performance**: Query performance equals or exceeds MongoDB for common operations
4. **API Compatibility**: All endpoints function identically with ESI format reconstruction
5. **Processing Continuity**: Queue processing resumes without data loss
6. **Service Functionality**: Full ESI format reconstruction working perfectly
7. **Storage Efficiency**: Reasonable disk usage (expect some increase due to indexing)
8. **Query Flexibility**: Can efficiently query individual aspects (attackers, items, etc.)

## Next Steps

1. **Review and approve** this normalized conversion plan
2. **Implement Prisma schema** with all four related tables
3. **Update KillmailService** for normalized operations and ESI reconstruction
4. **Develop migration scripts** with comprehensive testing and validation
5. **Execute staged migration** with monitoring and rollback capability
