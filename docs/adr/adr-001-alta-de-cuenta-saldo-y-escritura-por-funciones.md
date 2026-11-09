# ADR-001: Alta de cuenta por trigger, saldo almacenado y escritura solo por funciones

| Field | Value |
|-------|-------|
| Date | 2026-11-07 |
| Ticket | FEAT-001a |
| Status | Accepted |

## Context
MiBalance no tiene backend propio: el frontend habla directo con Supabase (`AGENTS.md`). Cada usuario necesitaba al entrar por primera vez una cuenta "Mi Cuenta" y dos categorías por defecto (`prd-FEAT-001a.md`, FR-01 y FR-02), y los tickets siguientes (FEAT-001b en adelante) registran movimientos que cambian el saldo de forma atómica (RNF-05) y solo sobre datos propios (RNF-03). Se definieron en FEAT-001a dónde se crea la cuenta, dónde vive el saldo y por qué camino escribe el cliente.

## Options considered

### Option 1: El cliente crea la cuenta y escribe las tablas con políticas RLS de escritura
- **Pros:** sin código SQL de servidor; todo en JavaScript.
- **Cons:** la creación dependía de que el cliente la ejecutara una vez (riesgo de cuentas duplicadas o faltantes); el alta de movimiento y la actualización del saldo eran dos escrituras separadas desde el navegador, sin atomicidad; cada política de escritura era una superficie más para RNF-03.

### Option 2: Trigger sobre `auth.users`, saldo en `BAT_CUENTAS`, cliente de solo lectura y escrituras por funciones `SECURITY DEFINER`
- **Pros:** la cuenta y las categorías nacen en la misma transacción que el usuario; el saldo se lee en una consulta; cada escritura es una función que valida al propietario y actualiza movimiento y saldo juntos.
- **Cons:** más SQL; un error en el trigger impide crear el usuario; el saldo almacenado puede divergir de "ingresos − gastos" si una función lo actualiza mal.

### Option 3: Saldo calculado en una vista a partir de los movimientos
- **Pros:** el saldo nunca diverge.
- **Cons:** cada lectura suma todos los movimientos (5.000 en la medición de RNF-02); `AGENTS.md` ya describía funciones que "actualizan el saldo".

## Decision
Se eligió la opción 2. El trigger `BATR_CREAR_CUENTA_USUARIO` garantizó una cuenta por usuario junto con `BAUQ_CUENTAS_USUARIO`; el saldo quedó en `BAT_CUENTAS` como `numeric` sin tope de dígitos enteros (RNF-04) con dos decimales exigidos por check; a `authenticated` se le dejó solo `select`, y la escritura quedó reservada a funciones `BASP_` `SECURITY DEFINER` con `search_path = ''`.

## Consequences
- Cada `BASP_` de los tickets siguientes valida por sí misma al propietario y actualiza movimiento y saldo en la misma transacción.
- La divergencia del saldo se controla con pruebas de secuencia (AC-32 de FEAT-001e), no con el modelo de datos.
- Archivos: `supabase/migrations/20261107000001_crear_esquema_inicial.sql`; detalle en `docs/daw/specs/spec-FEAT-001a.md`.
