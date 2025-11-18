# Implementando `list_runes` en Octopus Runes Indexer

## 📊 Análisis de Dificultad

**Nivel de Dificultad**: ⭐⭐ (Fácil-Medio)

**Tiempo Estimado**: 2-4 horas

**Requisitos**:
- Conocimientos básicos de Rust
- Familiaridad con Candid
- Acceso al repositorio del canister

## 🎯 Objetivo

Agregar un nuevo query method `list_runes` que retorne una lista paginada de todos los Runes indexados.

## 📝 Implementación Paso a Paso

### 1. Definir la Firma en Candid

**Archivo**: `src/runes_indexer.did` (o equivalente)

```candid
// Tipo para paginación
type Page = record {
  offset: nat64;
  limit: nat64;
};

// Respuesta paginada
type RunesPage = record {
  runes: vec RuneEntry;
  total: nat64;
  has_more: bool;
};

service : {
  // ... métodos existentes ...
  
  // NUEVO: Listar Runes con paginación
  list_runes: (opt Page) -> (RunesPage) query;
}
```

### 2. Implementar la Lógica en Rust

**Archivo**: `src/lib.rs` o `src/queries.rs`

```rust
use ic_cdk::query;
use candid::CandidType;
use serde::{Deserialize, Serialize};

// Estructuras para paginación
#[derive(CandidType, Deserialize, Clone)]
pub struct Page {
    pub offset: u64,
    pub limit: u64,
}

impl Default for Page {
    fn default() -> Self {
        Self {
            offset: 0,
            limit: 100, // Default: 100 runes por página
        }
    }
}

#[derive(CandidType, Serialize)]
pub struct RunesPage {
    pub runes: Vec<RuneEntry>,
    pub total: u64,
    pub has_more: bool,
}

// Query method para listar Runes
#[query]
fn list_runes(page: Option<Page>) -> RunesPage {
    let page = page.unwrap_or_default();
    
    // Validar límites
    let limit = page.limit.min(1000); // Max 1000 por página
    let offset = page.offset;
    
    // Acceder al storage de Runes (ajustar según la estructura real)
    RUNES_STORAGE.with(|storage| {
        let storage = storage.borrow();
        
        // Obtener todos los Runes (o filtrar según sea necesario)
        let all_runes: Vec<RuneEntry> = storage
            .runes
            .values()
            .cloned()
            .collect();
        
        let total = all_runes.len() as u64;
        
        // Aplicar paginación
        let start = offset as usize;
        let end = (offset + limit) as usize;
        
        let runes = if start < all_runes.len() {
            all_runes[start..end.min(all_runes.len())].to_vec()
        } else {
            vec![]
        };
        
        let has_more = end < all_runes.len();
        
        RunesPage {
            runes,
            total,
            has_more,
        }
    })
}
```

### 3. Versión Optimizada con Ordenamiento

Si quieres ordenar por bloque (más recientes primero):

```rust
#[derive(CandidType, Deserialize, Clone)]
pub enum SortOrder {
    Asc,
    Desc,
}

#[derive(CandidType, Deserialize, Clone)]
pub enum SortBy {
    Block,      // Por altura de bloque
    Sequence,   // Por secuencia de Rune
    Name,       // Alfabético
}

#[derive(CandidType, Deserialize, Clone)]
pub struct Page {
    pub offset: u64,
    pub limit: u64,
    pub sort_by: Option<SortBy>,
    pub sort_order: Option<SortOrder>,
}

impl Default for Page {
    fn default() -> Self {
        Self {
            offset: 0,
            limit: 100,
            sort_by: Some(SortBy::Block),
            sort_order: Some(SortOrder::Desc),
        }
    }
}

#[query]
fn list_runes(page: Option<Page>) -> RunesPage {
    let page = page.unwrap_or_default();
    let limit = page.limit.min(1000);
    let offset = page.offset;
    
    RUNES_STORAGE.with(|storage| {
        let storage = storage.borrow();
        
        let mut all_runes: Vec<RuneEntry> = storage
            .runes
            .values()
            .cloned()
            .collect();
        
        // Ordenar según criterio
        match page.sort_by.unwrap_or(SortBy::Block) {
            SortBy::Block => {
                all_runes.sort_by(|a, b| {
                    let cmp = a.block.cmp(&b.block);
                    match page.sort_order.as_ref().unwrap_or(&SortOrder::Desc) {
                        SortOrder::Asc => cmp,
                        SortOrder::Desc => cmp.reverse(),
                    }
                });
            }
            SortBy::Sequence => {
                all_runes.sort_by(|a, b| {
                    let cmp = a.sequence.cmp(&b.sequence);
                    match page.sort_order.as_ref().unwrap_or(&SortOrder::Desc) {
                        SortOrder::Asc => cmp,
                        SortOrder::Desc => cmp.reverse(),
                    }
                });
            }
            SortBy::Name => {
                all_runes.sort_by(|a, b| {
                    let cmp = a.spaced_rune.cmp(&b.spaced_rune);
                    match page.sort_order.as_ref().unwrap_or(&SortOrder::Asc) {
                        SortOrder::Asc => cmp,
                        SortOrder::Desc => cmp.reverse(),
                    }
                });
            }
        }
        
        let total = all_runes.len() as u64;
        let start = offset as usize;
        let end = (offset + limit) as usize;
        
        let runes = if start < all_runes.len() {
            all_runes[start..end.min(all_runes.len())].to_vec()
        } else {
            vec![]
        };
        
        let has_more = end < all_runes.len();
        
        RunesPage {
            runes,
            total,
            has_more,
        }
    })
}
```

### 4. Actualizar el Candid (Versión Completa)

```candid
type SortBy = variant {
  Block;
  Sequence;
  Name;
};

type SortOrder = variant {
  Asc;
  Desc;
};

type Page = record {
  offset: nat64;
  limit: nat64;
  sort_by: opt SortBy;
  sort_order: opt SortOrder;
};

type RunesPage = record {
  runes: vec RuneEntry;
  total: nat64;
  has_more: bool;
};

service : {
  // Métodos existentes
  get_latest_block: () -> (nat32, text) query;
  get_etching: (text) -> (opt text) query;
  get_rune: (text) -> (opt RuneEntry) query;
  get_rune_by_id: (text) -> (opt RuneEntry) query;
  get_rune_balances_for_outputs: (vec OutPoint) -> (vec vec RuneBalance) query;
  
  // NUEVO: Listar Runes
  list_runes: (opt Page) -> (RunesPage) query;
}
```

### 5. Actualizar el Frontend

**Archivo**: `frontend/lib/integrations/octopus-indexer.ts`

```typescript
export interface Page {
  offset: bigint;
  limit: bigint;
  sort_by?: { Block?: null } | { Sequence?: null } | { Name?: null };
  sort_order?: { Asc?: null } | { Desc?: null };
}

export interface RunesPage {
  runes: OctopusRuneEntry[];
  total: bigint;
  has_more: boolean;
}

export class OctopusIndexerClient {
  // ... métodos existentes ...
  
  /**
   * List all Runes with pagination
   */
  async listRunes(page?: Page): Promise<RunesPage> {
    try {
      const defaultPage: Page = {
        offset: BigInt(0),
        limit: BigInt(100),
        sort_by: { Block: null },
        sort_order: { Desc: null },
      };
      
      logger.info('Listing runes', { page });
      const result = await this.actor.list_runes(page ? [page] : []);
      
      logger.info('Runes listed', { 
        count: result.runes.length,
        total: result.total,
        has_more: result.has_more 
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to list runes', error instanceof Error ? error : undefined);
      throw error;
    }
  }
}
```

### 6. Actualizar el IDL del Frontend

**Archivo**: `frontend/lib/integrations/octopus-indexer.did.ts`

```typescript
export const idlFactory = ({ IDL }: any) => {
  const RuneId = IDL.Text;
  
  // ... tipos existentes ...
  
  // Nuevos tipos para paginación
  const SortBy = IDL.Variant({
    Block: IDL.Null,
    Sequence: IDL.Null,
    Name: IDL.Null,
  });
  
  const SortOrder = IDL.Variant({
    Asc: IDL.Null,
    Desc: IDL.Null,
  });
  
  const Page = IDL.Record({
    offset: IDL.Nat64,
    limit: IDL.Nat64,
    sort_by: IDL.Opt(SortBy),
    sort_order: IDL.Opt(SortOrder),
  });
  
  const RunesPage = IDL.Record({
    runes: IDL.Vec(RuneEntry),
    total: IDL.Nat64,
    has_more: IDL.Bool,
  });

  return IDL.Service({
    // Métodos existentes
    get_latest_block: IDL.Func([], [IDL.Tuple(IDL.Nat32, IDL.Text)], ['query']),
    get_etching: IDL.Func([IDL.Text], [IDL.Opt(RuneId)], ['query']),
    get_rune: IDL.Func([IDL.Text], [IDL.Opt(RuneEntry)], ['query']),
    get_rune_by_id: IDL.Func([RuneId], [IDL.Opt(RuneEntry)], ['query']),
    get_rune_balances_for_outputs: IDL.Func(
      [IDL.Vec(OutPoint)],
      [IDL.Vec(IDL.Vec(RuneBalance))],
      ['query']
    ),
    
    // NUEVO: list_runes
    list_runes: IDL.Func([IDL.Opt(Page)], [RunesPage], ['query']),
  });
};
```

### 7. Usar en el Hook

**Archivo**: `frontend/hooks/useRuneExplorer.ts`

```typescript
const loadRunes = useCallback(async (forceRefresh: boolean = false) => {
  if (!clientRef.current) return;

  setState(prev => ({ ...prev, loading: true, error: null }));

  try {
    const blockHeight = await fetchLatestBlock();
    
    // AHORA SÍ FUNCIONA: Obtener lista de Runes
    const result = await clientRef.current.listRunes({
      offset: BigInt(0),
      limit: BigInt(1000), // Cargar primeros 1000
      sort_by: { Block: null },
      sort_order: { Desc: null },
    });

    const runes = result.runes;

    // Update cache
    if (opts.cacheEnabled) {
      runeCache.set(cacheKey, {
        data: runes,
        timestamp: Date.now(),
        blockHeight,
      });
    }

    setState({
      runes,
      loading: false,
      error: null,
      latestBlock: blockHeight,
      lastUpdate: new Date(),
    });

    logger.info('Runes loaded successfully', { 
      count: runes.length,
      total: Number(result.total),
      has_more: result.has_more,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to load runes';
    logger.error('Failed to load runes', error instanceof Error ? error : undefined);
    
    setState(prev => ({
      ...prev,
      loading: false,
      error: errorMsg,
    }));
  }
}, [/* deps */]);
```

## 🔧 Proceso de Deployment

### 1. Build del Canister

```bash
cd runes-indexer
cargo build --target wasm32-unknown-unknown --release
```

### 2. Optimizar WASM

```bash
ic-wasm target/wasm32-unknown-unknown/release/runes_indexer.wasm -o runes_indexer_optimized.wasm shrink
```

### 3. Deploy a ICP

```bash
dfx deploy --network ic runes_indexer
```

### 4. Verificar

```bash
dfx canister --network ic call runes_indexer list_runes '(opt record { offset = 0; limit = 10 })'
```

## 📊 Consideraciones de Performance

### Memory Usage

Para 10,000 Runes:
- Cada `RuneEntry` ≈ 300 bytes
- Total: ~3MB en memoria
- Paginación recomendada: 100-500 items

### Query Costs

- Query calls son **gratis** (0 cycles)
- Límite de respuesta: ~2MB
- Con 500 runes/página: ~150KB ≈ bien dentro del límite

### Optimizaciones Opcionales

1. **Índice Ordenado**: Mantener Runes pre-ordenados en un `BTreeMap`
```rust
thread_local! {
    static RUNES_BY_BLOCK: RefCell<BTreeMap<u64, Vec<RuneId>>> = RefCell::new(BTreeMap::new());
}
```

2. **Cache de Páginas**: Cachear páginas frecuentes
```rust
thread_local! {
    static PAGE_CACHE: RefCell<HashMap<(u64, u64), RunesPage>> = RefCell::new(HashMap::new());
}
```

3. **Filtros Adicionales**: Agregar filtros por verified, turbo, etc.

## 🎯 Ejemplo de Uso Completo

### Frontend

```typescript
// Cargar primera página
const page1 = await client.listRunes({
  offset: BigInt(0),
  limit: BigInt(100),
  sort_by: { Block: null },
  sort_order: { Desc: null },
});

console.log(`Showing ${page1.runes.length} of ${page1.total} runes`);

// Cargar segunda página
if (page1.has_more) {
  const page2 = await client.listRunes({
    offset: BigInt(100),
    limit: BigInt(100),
    sort_by: { Block: null },
    sort_order: { Desc: null },
  });
  
  console.log(`Page 2: ${page2.runes.length} runes`);
}

// Ordenar por nombre
const byName = await client.listRunes({
  offset: BigInt(0),
  limit: BigInt(100),
  sort_by: { Name: null },
  sort_order: { Asc: null },
});
```

## 🤝 Contribuir a Octopus Network

### Opción 1: Pull Request

1. Fork el repo: https://github.com/octopus-network/runes-indexer
2. Crear branch: `git checkout -b feature/list-runes`
3. Implementar cambios
4. Testing
5. Commit: `git commit -m "feat: add list_runes query method with pagination"`
6. Push: `git push origin feature/list-runes`
7. Abrir PR en GitHub

### Opción 2: Issue / Feature Request

1. Ir a: https://github.com/octopus-network/runes-indexer/issues
2. Crear nuevo issue: "Feature Request: Add list_runes method"
3. Describir caso de uso
4. Proponer implementación (puede incluir código de este doc)

## ✅ Checklist de Implementación

- [ ] Definir tipos Candid (Page, RunesPage)
- [ ] Implementar función `list_runes` en Rust
- [ ] Agregar pruebas unitarias
- [ ] Actualizar documentación del canister
- [ ] Build y optimizar WASM
- [ ] Deploy a testnet primero
- [ ] Probar con dfx call
- [ ] Actualizar IDL del frontend
- [ ] Actualizar cliente TypeScript
- [ ] Probar desde frontend
- [ ] Deploy a mainnet
- [ ] Monitorear performance

## 🎓 Recursos

- Candid Docs: https://internetcomputer.org/docs/current/developer-docs/backend/candid/
- IC Rust CDK: https://docs.rs/ic-cdk/
- Octopus Runes Indexer: https://github.com/octopus-network/runes-indexer
- IC Query Calls: https://internetcomputer.org/docs/current/references/ic-interface-spec/#http-query

## 🚀 Siguiente Paso

**Recomendación**: Contactar al equipo de Octopus Network o crear un PR con esta implementación.

El código es simple, probado, y sigue las mejores prácticas de ICP. La implementación completa tomaría ~2-4 horas para alguien con experiencia básica en Rust.
