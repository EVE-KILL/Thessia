# New ESI Infrastructure

This is a complete rewrite of the ESI infrastructure with proper caching and separation of concerns.

## Architecture

- **`/ESI/client.ts`** - Core ESI client with Redis caching
- **`/ESI/services/`** - Business logic services that use the ESI client
- **`/ESI/index.ts`** - Main exports

## Key Features

### 1. **Proper Caching**

- Uses Redis for caching with ESI's own `expires` headers
- Respects ESI error limits and backs off automatically
- Cache keys based on method name and parameters

### 2. **Clean Separation of Concerns**

- ESI client only handles HTTP requests and caching
- Services handle business logic and database operations
- No more mixed responsibilities

### 3. **Smart Database Updates**

- Only updates database when actually fetching new data from ESI
- Preserves existing data (history, last_active, etc.)
- No more unnecessary `updatedAt` timestamp bumps

### 4. **Proper Error Handling**

- Graceful fallback to stale data when ESI fails
- Proper error propagation with meaningful messages
- Respects ESI rate limits

## Usage

### Basic Character Lookup

```typescript
import { characterService } from '../ESI'

// Get character with 24h cache (default)
const character = await characterService.getCharacter(90000001)

// Force refresh with 1h cache
const character = await characterService.getCharacter(90000001, 1)
```

### Direct ESI Client Usage

```typescript
import { getEsiClient } from '../ESI'

const esi = getEsiClient().esi

// All get* methods are automatically cached
const response = await esi.getCharacter({ character_id: 90000001 })
console.log(response.data)
```

### Using in Existing Code

Replace existing `getCharacter()` calls:

```typescript
// Old way
import { getCharacter } from '../server/helpers/ESIData'
const character = await getCharacter(character_id, force_update)

// New way
import { characterService } from '../ESI'
const character = await characterService.getCharacter(character_id, 24)
```

## Migration Strategy

1. **Phase 1**: Create new ESI infrastructure (✅ Done)
2. **Phase 2**: Update affiliation system to use new service
3. **Phase 3**: Gradually replace old ESIData calls
4. **Phase 4**: Remove old ESIData.ts file

## Benefits Over Old System

### ❌ Old Problems

- `updatedAt` constantly bumped preventing affiliation updates
- Mixed ESI fetching with business logic
- Inconsistent caching strategies
- Complex force_update/bypass_cache flags
- Alliance/faction data assumed to come from ESI character endpoint

### ✅ New Solutions

- Database only updated when new ESI data is fetched
- Clean separation between ESI client and business services
- Consistent Redis-based caching using ESI headers
- Simple `maxAgeHours` parameter
- Properly derives alliance/faction from corporation data

## Performance Impact

- **Reduced ESI calls**: Better caching with proper expiration
- **Reduced database writes**: Only update when data actually changes
- **Faster affiliation updates**: Characters won't be constantly "fresh"
- **Better error handling**: Graceful degradation when ESI is down

## Configuration

Environment variables:

```bash
REDIS_URL=redis://localhost:6379  # Redis connection
```

The client automatically handles:

- ESI error limits
- Request timeouts
- Cache expiration
- Redis connection management
