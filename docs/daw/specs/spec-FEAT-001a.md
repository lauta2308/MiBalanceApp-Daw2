# Spec FEAT-001a: Entrar y ver la cuenta

| Field | Value |
|-------|-------|
| Ticket | FEAT-001a |
| PRD | docs/daw/prd/prd-FEAT-001a.md |
| Tier | FEATURE |
| Date | 2026-11-07 |
| Spec loops | 4 |
| Loops since last human decision | 0 |
| ADR | docs/adr/adr-001-alta-de-cuenta-saldo-y-escritura-por-funciones.md |
| Threat model | docs/daw/security/threat-FEAT-001a.md |

## Summary
Se crea el proyecto React 19 + Vite 8 que habla directo con Supabase. Una migración define `BAT_CUENTAS`, `BAT_CATEGORIAS` y `BAT_MOVIMIENTOS` con RLS de solo lectura para el propietario, y un trigger sobre `auth.users` crea "Mi Cuenta" (USD, saldo 0) y las dos categorías por defecto en la misma transacción que el usuario (ADR-001). El frontend inicia una sesión anónima provisoria, aislada en `src/autenticacion/sesionProvisoria.js` para reemplazarla por Google, y muestra la sección Cuenta con el encabezado, el saldo formateado desde texto (sin float) y el mensaje de lista vacía.

Decisiones del usuario en PLAN (2026-11-07): `npm test` corre solo las pruebas unitarias (`src/`), y `npm run test:integracion` corre `pruebas/` contra Supabase real. Todavía no hay proyecto de Supabase: las pruebas de integración se escriben ahora y se saltan con un aviso si falta `.env.local`.

Decisión del usuario en PLAN (2026-11-08): restaurar sin cambios la sección de dependencias entre bloques, que se había borrado de la copia de trabajo. También corregir el test del Block 2 para que espere el saldo inicial como `"0"`, porque es el texto que devuelve una columna `numeric` sin escala fija. Vuelta de CODE (Block 2): `BAFK_MOVIMIENTOS_CATEGORIA` deja de usar `on delete restrict`, porque impedía borrar un usuario con movimientos.

## Coverage: PRD → blocks
| Requirement | Covered by |
|---|---|
| FR-01 | Block 2 |
| FR-02 | Block 2 |
| FR-03 | Block 3 |
| FR-04 | Block 3 |
| FR-05 | Block 1 (formato del saldo), Block 4 (pantalla) |
| FR-06 | Block 4 |
| FR-07 | Block 3 |
| NFR-01 | Block 2 — Strategy: RLS de `select` por propietario en las tres tablas, sin privilegios de escritura; AC-27 lo prueba contra la API real con 2 usuarios (0 filas ajenas en 3 consultas) |
| NFR-02 | Block 3 — Strategy: un único texto de error fijo para el inicio de sesión, sin el error técnico; el test verifica que el 100% del texto mostrado es ese mensaje |

## Dependencies between blocks
Block 1 → Block 2 → Block 3 → Block 4. Block 2 usa el cliente y la configuración de pruebas del Block 1; Block 3 usa `MensajeError` y el cliente; Block 4 se monta dentro de `GuardiaSesion` (Block 3) y lee las tablas del Block 2.

## Block 1 — Proyecto base y formato del saldo

**Files**
- `package.json` (new) — dependencias en su última versión estable: `react`, `react-dom`, `@supabase/supabase-js`; desarrollo: `vite`, `@vitejs/plugin-react`, `eslint`, `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`. Scripts: `dev`, `build`, `preview`, `lint`, `test` (`vitest run --project unidad`), `test:integracion` (`vitest run --project integracion`).
- `package-lock.json` (new) — generado por `npm install`, se commitea.
- `index.html` (new) — `lang="es"`, título "MiBalance", monta `src/main.jsx`.
- `vite.config.js` (new) — plugin de React y `test.projects`: `unidad` (`src/**/*.test.{js,jsx}`, entorno `jsdom`, `setupFiles: ['src/configuracionPruebas.js']`) e `integracion` (`pruebas/**/*.test.js`, entorno `node`, `env` con las variables `VITE_*` de `loadEnv`, `fileParallelism: false`).
- `eslint.config.js` (new) — configuración plana con `@eslint/js`, `react-hooks` y `react-refresh`.
- `.env.example` (new) — `VITE_SUPABASE_URL=` y `VITE_SUPABASE_ANON_KEY=`, sin valores. Nunca `service_role`.
- `.gitignore` (modified) — agrega `node_modules/`, `dist/` y `.env.local` fuera del bloque `# BEGIN DAW … # END DAW`.
- `src/main.jsx` (new) — `createRoot` + `StrictMode` + `App`.
- `src/App.jsx` (new) — por ahora renderiza el título "MiBalance"; el Block 4 lo reemplaza.
- `src/estilos.css` (new) — estilos base (foco visible, ancho fluido).
- `src/configuracionPruebas.js` (new) — importa `@testing-library/jest-dom/vitest`.
- `src/servicios/clienteSupabase.js` (new) — `ObtenerConfiguracionSupabase(variables)` valida las dos variables y exporta `clienteSupabase = createClient(url, claveAnonima)` con `persistSession: true` (valor por defecto, en `localStorage`).
- `src/utilidades/formatoMoneda.js` (new) — `FormatearSaldo(saldoTexto, codigoMoneda)`.
- `src/utilidades/formatoMoneda.test.js` (new).
- `src/servicios/clienteSupabase.test.js` (new).

**Logic**
Implementa la parte de formato de FR-05. `FormatearSaldo` recibe el saldo como texto tal como lo devuelve PostgreSQL con `::text` (ej. `"-1234.5"`, `"0"`, `"999999999999.99"`) y devuelve `"{moneda} {signo}{enteros con punto de miles},{dos decimales}"` solo con operaciones de texto: separa el signo, separa enteros y decimales por el punto, completa los decimales a 2 con ceros, agrupa los enteros de a tres con `.` y une con `,`. Nunca usa `parseFloat`, `Number` ni `toFixed` (RNF-04, R-07 del modelo de amenazas). `ObtenerConfiguracionSupabase` lanza un error si falta alguna variable, antes de crear el cliente.

**Data model**
- No schema change. `FormatearSaldo` formatea el texto de `bat_cuentas.saldo` que crea el Block 2; constraints as declared there: `saldo numeric` NOT NULL, default 0, `BACK_CUENTAS_SALDO_DOS_DECIMALES`; `moneda char(3)` NOT NULL con `BACK_CUENTAS_MONEDA_FORMATO`.

**Input validation**
- `saldoTexto`: string que cumple `^-?\d+(\.\d{1,2})?$`; cualquier otra cosa (vacío, `null`, `"abc"`, `"1,5"`, `"1.234"` con tres decimales) es inválida.
- `codigoMoneda`: string de exactamente 3 letras mayúsculas (`^[A-Z]{3}$`).
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: strings no vacíos.

**Error handling**
- `saldoTexto` o `codigoMoneda` con formato inválido — `FormatearSaldo` lanza `Error('Formato de saldo inválido')`; quien lo llama (Block 4) lo trata como error de carga y muestra el mensaje de error, nunca un saldo incorrecto.
- Variable de entorno faltante — `ObtenerConfiguracionSupabase` lanza `Error('Falta la variable VITE_SUPABASE_URL')` (o la clave); la aplicación no arranca con un cliente mal configurado.

**Required tests**
- [ ] `FormatearSaldo('0', 'USD')` devuelve `"USD 0,00"` — validates AC-01
- [ ] `FormatearSaldo('11000', 'USD')` devuelve `"USD 11.000,00"` y `FormatearSaldo('1500.5', 'USD')` devuelve `"USD 1.500,50"` — validates AC-01
- [ ] `FormatearSaldo('-1000', 'USD')` devuelve `"USD -1.000,00"`
- [ ] `FormatearSaldo('1999999999999.98', 'USD')` devuelve `"USD 1.999.999.999.999,98"` sin perder dígitos
- [ ] saldo inválido rechazado: `""`, `"abc"`, `"1,5"`, `"1.234"` y `null` lanzan `Formato de saldo inválido`
- [ ] moneda inválida rechazada: `"usd"` y `"US"` lanzan error
- [ ] variable faltante: `ObtenerConfiguracionSupabase({})` lanza el error que nombra `VITE_SUPABASE_URL`
- [ ] `npm run lint` termina sin errores y `npm audit --audit-level=high` no reporta hallazgos altos ni críticos

**Completion criterion**
`npm install`, `npm run lint`, `npm test` y `npm run build` terminan sin errores, y los tests de `formatoMoneda.test.js` y `clienteSupabase.test.js` pasan.

## Block 2 — Esquema, alta de cuenta y aislamiento

**Files**
- `supabase/migrations/20261107000001_crear_esquema_inicial.sql` (new) — tablas, restricciones, índices, RLS, permisos, función y trigger.
- `supabase/scripts/limpiar_usuarios_prueba.sql` (new) — borra los usuarios de prueba.
- `pruebas/ayudantesPruebas.js` (new) — `ObtenerConfiguracionPruebas()` (devuelve `null` si faltan las variables), `CrearClientePrueba()` (cliente con almacenamiento en memoria propio) y `CrearUsuarioPrueba()` (`signInAnonymously({ options: { data: { es_prueba: true } } })`).
- `pruebas/esquemaCuenta.test.js` (new) — pruebas de integración contra Supabase real; `describe.skipIf(!ObtenerConfiguracionPruebas())` con un `console.warn` que explica que falta `.env.local`.

**Logic**
Implementa FR-01, FR-02 y NFR-01 según ADR-001. La función `BATF_CREAR_CUENTA_USUARIO()` (`returns trigger`, `language plpgsql`, `security definer`, `set search_path = ''`) inserta en `public.bat_cuentas` (`id_usuario = new.id`, `nombre = 'Mi Cuenta'`, `moneda = 'USD'`, `saldo = 0`) y, con el id devuelto, las categorías `('Pago Realizado', 'GASTO', true)` y `('Pago Ingresado', 'INGRESO', true)` en `public.bat_categorias`. El trigger `BATR_CREAR_CUENTA_USUARIO` es `after insert on auth.users for each row`. Si la función falla, se revierte el alta del usuario completo: nunca queda un usuario sin cuenta. Permisos: `revoke all on` las tres tablas `from anon, authenticated`; `grant select on` las tres tablas `to authenticated`; `revoke execute on function public.batf_crear_cuenta_usuario() from public, anon, authenticated`.

**Data model**
- `BAT_CUENTAS`: `id uuid` (`BAPK_CUENTAS`, default `gen_random_uuid()`), `id_usuario uuid not null` (`BAFK_CUENTAS_USUARIO` → `auth.users(id)` `on delete cascade`; `BAUQ_CUENTAS_USUARIO` unique), `nombre varchar(30) not null`, `moneda char(3) not null default 'USD'` (`BACK_CUENTAS_MONEDA_FORMATO`: `moneda ~ '^[A-Z]{3}$'`), `saldo numeric not null default 0` (sin precisión fija: RNF-04 pide no tener tope de dígitos enteros; `BACK_CUENTAS_SALDO_DOS_DECIMALES`: `saldo = round(saldo, 2)`), `fecha_alta timestamptz not null default now()`.
- `BAT_CATEGORIAS`: `id uuid` (`BAPK_CATEGORIAS`), `id_cuenta uuid not null` (`BAFK_CATEGORIAS_CUENTA` → `bat_cuentas(id)` `on delete cascade`), `nombre varchar(30) not null`, `tipo text not null` (`BACK_CATEGORIAS_TIPO`: `tipo in ('INGRESO','GASTO')`), `es_defecto boolean not null default false`, `fecha_alta timestamptz not null default now()`. Índices: `BAIX_CATEGORIAS_CUENTA (id_cuenta)`; índice único parcial `BAUQ_CATEGORIAS_DEFECTO_CUENTA_TIPO (id_cuenta, tipo) where es_defecto` (se usa `BAUQ_` porque garantiza unicidad).
- `BAT_MOVIMIENTOS`: `id uuid` (`BAPK_MOVIMIENTOS`), `id_cuenta uuid not null` (`BAFK_MOVIMIENTOS_CUENTA` → `bat_cuentas(id)` `on delete cascade`), `id_categoria uuid not null` (`BAFK_MOVIMIENTOS_CATEGORIA` → `bat_categorias(id)` `on delete no action deferrable initially deferred`: sigue rechazando borrar una categoría en uso, pero comprueba al final de la transacción para que el borrado en cascada de un usuario con movimientos funcione), `tipo text not null` (`BACK_MOVIMIENTOS_TIPO`), `monto numeric(14,2) not null` (`BACK_MOVIMIENTOS_MONTO_POSITIVO`: `monto > 0`), `fecha date not null`, `fecha_alta timestamptz not null default now()`. Índices: `BAIX_MOVIMIENTOS_CUENTA_FECHA (id_cuenta, fecha desc, fecha_alta desc)`, `BAIX_MOVIMIENTOS_CATEGORIA (id_categoria)`. Se crea ahora porque AC-22 cuenta movimientos y AC-27 los lee; las altas llegan en FEAT-001b mediante un `BASP_` `SECURITY DEFINER`.
- Rollback: es la primera migración y no hay datos reales (solo usuarios anónimos de prueba). Para revertirla: `drop trigger batr_crear_cuenta_usuario on auth.users; drop function public.batf_crear_cuenta_usuario(); drop table public.bat_movimientos, public.bat_categorias, public.bat_cuentas;` y borrar los usuarios anónimos con `limpiar_usuarios_prueba.sql`. El paso queda documentado como comentario al final de la migración.
- RLS habilitado en las tres tablas. Políticas `for select to authenticated`: `BAPOL_CUENTAS_PROPIETARIO` (`id_usuario = (select auth.uid())`), `BAPOL_CATEGORIAS_PROPIETARIO` y `BAPOL_MOVIMIENTOS_PROPIETARIO` (`id_cuenta in (select id from public.bat_cuentas where id_usuario = (select auth.uid()))`). Sin políticas de escritura.

**Input validation**
- El cliente no escribe en ninguna tabla: los privilegios de escritura están revocados.
- El trigger solo lee `new.id` de `auth.users`; no recibe datos del cliente.
- `limpiar_usuarios_prueba.sql`: `delete from auth.users where is_anonymous = true and raw_user_meta_data->>'es_prueba' = 'true' returning id`.

**Error handling**
- Escritura directa desde la API (`insert`, `update` o `delete` en cualquiera de las tres tablas) — PostgREST la rechaza por falta de privilegios (`42501`); los datos no cambian.
- Consulta de filas de otro usuario — RLS devuelve 0 filas, sin error que confirme su existencia.
- Falta `.env.local` al correr `npm run test:integracion` — las pruebas se saltan y `console.warn` indica qué variable falta; no fallan con un error de red.

**Required tests**
- [ ] usuario nuevo tiene una cuenta "Mi Cuenta", moneda "USD" y saldo "0" leído como texto — validates AC-01
- [ ] usuario nuevo tiene exactamente dos categorías: "Pago Ingresado" INGRESO y "Pago Realizado" GASTO, ambas `es_defecto` — validates AC-02
- [ ] lectura no autorizada: A consulta la cuenta, las categorías y los movimientos de B por sus ids y recibe 0 filas en cada consulta — validates AC-27
- [ ] escritura rechazada: A intenta `insert` en `bat_cuentas`, `update` de su propio `saldo` y `delete` de su categoría "Pago Ingresado"; las tres operaciones son rechazadas y los datos no cambian
- [ ] configuración faltante: `ObtenerConfiguracionPruebas()` devuelve `null` sin las variables, y las pruebas quedan marcadas como salteadas

**Completion criterion**
La migración corre sin errores sobre un proyecto vacío. Con `.env.local` y la migración aplicada, `npm run test:integracion` pasa; sin `.env.local`, termina salteando las pruebas con el aviso. El SQL revisado nombra cada objeto con el prefijo de `AGENTS.md`.

## Block 3 — Sesión provisoria y mensaje de error

**Files**
- `src/autenticacion/sesion.js` (new) — interfaz estable para el resto de la aplicación: `AsegurarSesion()` (devuelve la sesión actual o inicia una) y `MENSAJE_ERROR_SESION`. Importa la implementación de `sesionProvisoria.js`; al pasar a Google solo cambia esa importación.
- `src/autenticacion/sesionProvisoria.js` (new) — `ObtenerSesionActual()` (`auth.getSession()`), `IniciarSesionProvisoria()` (`auth.signInAnonymously()`, único archivo que lo llama) y `MENSAJE_ERROR_SESION = 'No se pudo iniciar la sesión. Vuelva a intentarlo.'`.
- `src/componentes/MensajeError.jsx` (new) — `role="alertdialog"`, `aria-modal`, el texto y el botón "Aceptar" (`alAceptar`, `deshabilitado`); no se cierra por tiempo.
- `src/componentes/GuardiaSesion.jsx` (new) — al montar llama a `AsegurarSesion()`; muestra "Cargando…" mientras espera, los `children` si hay sesión y `MensajeError` si falla. "Aceptar" deshabilita el botón y reintenta.
- `src/autenticacion/sesion.test.js` (new).
- `src/componentes/MensajeError.test.jsx` (new).
- `src/componentes/GuardiaSesion.test.jsx` (new).
- `pruebas/sesionPersistente.test.js` (new).

**Logic**
Implementa FR-03, FR-04, FR-07 y NFR-02. `AsegurarSesion()` guarda la promesa en curso a nivel de módulo: dos llamadas simultáneas (el doble efecto del modo estricto de React) comparten la misma promesa y crean un solo usuario; si la promesa termina en error, se descarta para que "Aceptar" pueda reintentar. Primero llama a `ObtenerSesionActual()`; solo si no hay sesión llama a `IniciarSesionProvisoria()`. La sesión persiste en `localStorage` (opción por defecto de supabase-js), así que al volver a abrir el navegador `getSession()` devuelve el mismo usuario y no se crea otra cuenta. Los textos se renderizan como texto de React; no se usa `dangerouslySetInnerHTML` (R-06).

**Input validation**
- No acepta datos del usuario: la única interacción es el botón "Aceptar".

**Error handling**
- `signInAnonymously` devuelve `error` o la promesa es rechazada (red, límite por IP, inicio anónimo deshabilitado) — `GuardiaSesion` muestra `MensajeError` con `MENSAJE_ERROR_SESION`; el detalle técnico solo va a `console.error` en desarrollo.
- El reintento con "Aceptar" también falla — se vuelve a mostrar el mismo mensaje con "Aceptar" habilitado.
- Llamada duplicada concurrente a `AsegurarSesion()` — se devuelve la promesa en curso; nunca se crean dos usuarios.

**Required tests**
- [ ] con sesión existente, `AsegurarSesion()` no llama a `IniciarSesionProvisoria()` — validates AC-03
- [ ] llamada duplicada concurrente: dos `AsegurarSesion()` simultáneas sin sesión llaman una sola vez a `IniciarSesionProvisoria()`
- [ ] inicio de sesión rechazado: `GuardiaSesion` muestra exactamente "No se pudo iniciar la sesión. Vuelva a intentarlo." con "Aceptar" y sin el texto del error técnico — validates AC-04
- [ ] error de reintento: tras un primer fallo, "Aceptar" se deshabilita mientras reintenta; si el reintento falla, el mensaje vuelve a mostrarse, y si funciona se muestran los `children` — validates AC-04
- [ ] `MensajeError` sigue visible a los 10 segundos (temporizadores falsos) y solo llama a `alAceptar` al presionar "Aceptar" — validates AC-04
- [ ] integración (se saltea sin `.env.local`): un cliente con almacenamiento compartido inicia sesión, se crea un segundo cliente con el mismo almacenamiento y `getSession()` devuelve el mismo usuario, con la misma cuenta y sin categorías por defecto duplicadas — validates AC-03

**Completion criterion**
`npm test` pasa con los tests de `sesion.test.js`, `MensajeError.test.jsx` y `GuardiaSesion.test.jsx`, y `signInAnonymously` aparece en un solo archivo (`grep -r signInAnonymously src` devuelve solo `sesionProvisoria.js`).

## Block 4 — Sección Cuenta

**Files**
- `src/servicios/cuentas.js` (new) — `ObtenerCuenta()` (`from('bat_cuentas').select('id, nombre, moneda, saldo::text').single()`) y `ContarMovimientos()` (`from('bat_movimientos').select('id', { count: 'exact', head: true })`).
- `src/paginas/SeccionCuenta.jsx` (new) — encabezado `{nombre} ({moneda})`, saldo con `FormatearSaldo`, y "Aquí verá sus movimientos." si el conteo es 0.
- `src/paginas/SeccionCuenta.test.jsx` (new).
- `src/servicios/cuentas.test.js` (new).
- `src/App.jsx` (modified) — `<GuardiaSesion><SeccionCuenta /></GuardiaSesion>` como pantalla inicial.

**Logic**
Implementa FR-05 (pantalla) y FR-06. Al montar, `SeccionCuenta` pide en paralelo la cuenta y el conteo de movimientos; mientras tanto muestra "Cargando…". Con los datos muestra el encabezado (`<h1>`), el saldo formateado y, si el conteo es 0, el párrafo "Aquí verá sus movimientos.". No filtra por usuario: RLS devuelve solo la cuenta del propietario del JWT. La lista con movimientos llega en FEAT-001b.

**Data model**
- Reuses `bat_cuentas` y `bat_movimientos` from Block 2 — no schema change; constraints as declared there: NOT NULL en `nombre`, `moneda`, `saldo`; `BAUQ_CUENTAS_USUARIO` (una cuenta por usuario, por eso `.single()`); `BACK_CUENTAS_SALDO_DOS_DECIMALES`; índice `BAIX_MOVIMIENTOS_CUENTA_FECHA` para el conteo.

**Input validation**
- No acepta datos del usuario. Los datos que llegan de la API se validan al formatear: `saldo` como texto con el patrón de `FormatearSaldo` y `moneda` con `^[A-Z]{3}$` (Block 1).

**Error handling**
- Error de red o del servidor al cargar la cuenta o el conteo — se muestra `MensajeError` con "No se pudo cargar su cuenta. Vuelva a intentarlo."; "Aceptar" reintenta la carga.
- Cuenta faltante (`.single()` sin filas) o saldo con formato inválido — mismo mensaje; nunca se muestra un saldo inventado ni `USD 0,00` por defecto.

**Required tests**
- [ ] con la cuenta `{nombre: 'Mi Cuenta', moneda: 'USD', saldo: '0'}` y 0 movimientos, muestra "Mi Cuenta (USD)" y "USD 0,00" — validates AC-01
- [ ] con 0 movimientos muestra "Aquí verá sus movimientos." y con 3 movimientos no lo muestra — validates AC-22
- [ ] error de carga: si `ObtenerCuenta` es rechazada, muestra "No se pudo cargar su cuenta. Vuelva a intentarlo." con "Aceptar", y al presionarlo reintenta
- [ ] cuenta faltante o saldo inválido: si `ObtenerCuenta` devuelve un error de 0 filas o un saldo `"abc"`, muestra el mismo mensaje de error y no muestra un saldo
- [ ] `ObtenerCuenta` pide `saldo::text` y `ContarMovimientos` usa `head: true` (cliente simulado)

**Completion criterion**
`npm test` pasa con los tests de `SeccionCuenta.test.jsx` y `cuentas.test.js`, y `npm run build` genera el bundle sin errores.

## Final verification
`npm run lint`, `npm test` y `npm run build` pasan; `npm run test:integracion` pasa con un proyecto de Supabase configurado, o saltea las pruebas con el aviso mientras no exista (decisión del usuario, 2026-11-07). Cada AC de `prd-FEAT-001a.md` (AC-01, AC-02, AC-03, AC-04, AC-22, AC-27) tiene al menos un test que lo nombra, y `validate_spec.py --tier FEATURE` pasa sobre este documento.
