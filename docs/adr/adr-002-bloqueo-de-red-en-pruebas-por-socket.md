# ADR-002: Bloqueo de red de las pruebas unitarias a nivel de socket

| Field | Value |
|-------|-------|
| Date | 2026-11-10 |
| Ticket | FEAT-002 |
| Status | Accepted |

## Context
FEAT-002 pidió que las pruebas unitarias rechacen toda conexión a un servicio externo y que la prueba que lo intente falle (FR-08, AC-08). Varias pruebas existentes reemplazan `fetch` con `vi.stubGlobal`, y el cliente de Supabase usa el `fetch` nativo de Node, que conecta por undici.

## Options considered

### Option 1: envolver `globalThis.fetch`
- **Pros:** pocas líneas, fácil de leer.
- **Cons:** `vi.stubGlobal('fetch')` lo reemplaza y lo saltea; no cubre `http`, `https`, `net`, UDP ni XHR.

### Option 2: librería de intercepción (msw o nock)
- **Pros:** API conocida, mensajes claros.
- **Cons:** suma una dependencia; cada una cubre solo una parte (msw las APIs de fetch y XHR, nock el módulo `http`); deja pasar `net` y UDP directos.

### Option 3: parchear `net.Socket.prototype.connect`, `dgram` y el XHR síncrono
- **Pros:** un solo punto por el que pasan `net`, `tls`, `http`, `https` y undici; no lo afectan los stubs de `fetch`; sin dependencias nuevas.
- **Cons:** depende de cómo Node arma los argumentos de `connect`; el XHR síncrono de jsdom corre en otro hilo y se intercepta aparte.

## Decision
Se eligió la opción 3, porque fue la única que cubrió todos los caminos de red del proceso sin dependencias nuevas y sin chocar con las pruebas que ya simulan `fetch`.

## Consequences
- Archivos: `src/bloqueoRedPruebas.js` y `src/configuracionPruebas.js` (spec FEAT-002, Block 1).
- El bloqueo quedó atado a la forma interna de los argumentos de `connect`; un cambio de Node en esa forma se ve como pruebas de bloqueo que fallan.
- Los procesos hijos que lance una prueba quedaron fuera del bloqueo.
