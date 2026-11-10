# Spec FEAT-002: Integración continua en cada pull request

| Field | Value |
|-------|-------|
| Ticket | FEAT-002 |
| PRD | docs/daw/prd/prd-FEAT-002.md |
| Tier | FEATURE |
| Date | 2026-11-10 |
| Spec loops | 1 |
| Loops since last human decision | 0 |

## Summary
Dos bloques. El primero instala, dentro del proceso de las pruebas unitarias de Vitest (proyecto `unidad`), un bloqueo que rechaza toda conexión a un host externo por TCP, TLS, UDP o XHR síncrono, registra cada intento y hace fallar la prueba que lo provocó. El segundo agrega el workflow de GitHub Actions `.github/workflows/ci.yml`, que en cada pull request instala con `npm ci`, corre `npm run lint` y `npm test` sin secretos, y una prueba unitaria que lee ese archivo como texto y verifica su contrato. No se agregan dependencias de npm.

Decisión del usuario (2026-11-10): la instalación usa `npm ci` y no `npm install`, porque AC-02 exige las versiones fijadas en `package-lock.json`.

Decisión del usuario (2026-11-10), vuelta de VERIFY por F-VER-06: cada prueba requerida se nombra `test_…`, y el título de su `it(...)` en el código empieza con ese mismo identificador. La regla queda escrita en `AGENTS.md` (Code conventions) para los tickets siguientes.

## Coverage: PRD → blocks
| Requirement | Covered by |
|---|---|
| FR-01 | Block 2 |
| FR-02 | Block 2 |
| FR-03 | Block 2 |
| FR-04 | Block 2 |
| FR-05 | Block 2 |
| FR-06 | Block 2 |
| FR-07 | Block 1, Block 2 |
| FR-08 | Block 1 |
| NFR-01 | Strategy: el workflow no lee `secrets.*` ni define variables; la prueba `ci_sin_secretos_ni_credenciales` falla si aparece cualquiera de los dos |
| NFR-02 | Strategy: el bloqueo del Block 1 rechaza toda conexión externa y hace fallar la prueba; con 0 intentos registrados la ejecución pasa |
| NFR-03 | Strategy: `actions/setup-node` con `node-version: 22` flotante, que resuelve la última 22.x; el lock exige 22.19 o superior para undici y jsdom, así que no se fija 22.12 |

## Dependencies between blocks
Block 2 depende de Block 1: el workflow corre `npm test`, y el bloqueo tiene que estar instalado antes para que AC-07 y AC-08 se cumplan en la integración continua. Orden: Block 1 → Block 2.

## Block 1 — Bloqueo de red en las pruebas unitarias

**Files**
- `src/bloqueoRedPruebas.js` (new) — el bloqueo, su registro de intentos y las comprobaciones.
- `src/configuracionPruebas.js` (modified) — instala el bloqueo y registra los `afterEach` y `afterAll` que lo comprueban. Es `setupFiles` solo del proyecto `unidad` (`vite.config.js:15`), así que el proyecto `integracion` no cambia.
- `src/bloqueoRedPruebas.test.js` (new) — pruebas del bloqueo.

**Logic**
Implementa FR-07 y FR-08. `src/bloqueoRedPruebas.js` exporta:
- `InstalarBloqueoRed()`: idempotente. Reemplaza `net.Socket.prototype.connect` (cubre `net`, `tls`, `http`, `https` y el `fetch` nativo de undici, que conectan por ese método), `dgram.Socket.prototype.send` y `dgram.Socket.prototype.connect`, y, si existe `globalThis.XMLHttpRequest` (entorno jsdom), `XMLHttpRequest.prototype.open` cuando el tercer argumento es `false`. Se intercepta el XHR síncrono en `open` porque jsdom lo ejecuta en un worker_thread donde el parche de `net` no existe.
- `EsHostLocal(host)`: `true` solo para `localhost`, `127.0.0.0/8`, `::1`, `::ffff:127.x.x.x`, host vacío u omitido, y conexiones por ruta de socket local. La comparación es exacta, nunca por prefijo (R-06).
- `ObtenerIntentosBloqueados()`: copia del registro, con `{ protocolo, host, puerto, prueba }`. Guarda solo destino, nunca contenido (R-08).
- `ComprobarIntentosBloqueados()`: si hay intentos, vacía el registro y lanza un `Error` que nombra cada `host:puerto`; si no hay, no hace nada.
- `VerificarBloqueoInstalado()`: `true` si los métodos parcheados siguen siendo los del bloqueo (R-07).

Ante un destino externo, `connect` no conecta: registra el intento, programa con `process.nextTick` un `destroy` del socket con un error de código `ERR_RED_BLOQUEADA` y devuelve el socket, con la misma forma asíncrona de un fallo de red real. `send` y `connect` de `dgram` hacen lo mismo con su callback o evento de error. `open` síncrono lanza el error de inmediato.

`src/configuracionPruebas.js` llama a `InstalarBloqueoRed()` y registra:
- `afterEach`: falla si `VerificarBloqueoInstalado()` es `false`, y después llama a `ComprobarIntentosBloqueados()`. Así falla la prueba que provocó el intento aunque el código bajo prueba haya capturado el error.
- `afterAll`: llama a `ComprobarIntentosBloqueados()` para los intentos que no quedaron atribuidos a ninguna prueba (en `beforeAll`, al importar o asíncronos tardíos).

Restricciones de lint: `process` se importa de `node:process`, `afterEach` y `afterAll` de `vitest`, y no se usan `__dirname` ni `Buffer`, porque `eslint.config.js` solo declara globals de navegador para `src/**`.

**Input validation**
- Argumentos de `net.Socket.prototype.connect`: se leen las cuatro formas que llegan, que son el arreglo normalizado `[opciones, cb]` de `net.connect`, `(opciones, cb)` de `tls`, `(puerto, host, cb)` y `(ruta, cb)`. Host: string, `undefined` o vacío; puerto: número o string numérico.
- Una forma no reconocida se trata como destino externo y se rechaza, nunca se deja pasar.
- `XMLHttpRequest.prototype.open`: la URL se resuelve con `new URL(url, location.href)` y se usa su `hostname`.

**Error handling**
- Conexión TCP o TLS a un host externo: rechazada con `ERR_RED_BLOQUEADA` y registrada.
- Envío UDP a un host externo: rechazado con `ERR_RED_BLOQUEADA` y registrado.
- XHR síncrono a un host externo: rechazado con `ERR_RED_BLOQUEADA` al llamar a `open`, y registrado.
- Host que imita loopback por prefijo (`127.0.0.1.ejemplo.com`, `localhost.ejemplo.com`): rechazado como externo.
- Intentos registrados al terminar una prueba o un archivo: error que hace fallar la prueba o el archivo, nombrando cada `host:puerto`.
- Bloqueo desinstalado por una prueba: error que hace fallar esa prueba.

**Required tests**
- [ ] `test_rechaza_conexion_tcp_externa` — `net.connect` a `example.com:443` emite un error `ERR_RED_BLOQUEADA` (rechazado) y queda registrado — validates AC-08
- [ ] `test_rechaza_fetch_externo` — `fetch('https://example.com')` es rechazado y queda registrado — validates AC-08
- [ ] `test_rechaza_https_externo` — `https.get` a un host externo es rechazado con error — validates AC-08
- [ ] `test_rechaza_udp_externo` — `dgram` hacia un host externo es rechazado con error — validates AC-08
- [ ] `test_rechaza_xhr_sincrono_externo` — `open` síncrono hacia un host externo es rechazado con error — validates AC-08
- [ ] `test_rechaza_host_que_imita_loopback` — `127.0.0.1.ejemplo.com` y `localhost.ejemplo.com` son rechazados como externos — validates AC-08
- [ ] `test_permite_loopback` — una conexión a un servidor local en `127.0.0.1` funciona y no registra intentos — validates AC-07
- [ ] `test_intento_registrado_marca_error_en_la_prueba` — tras un intento rechazado, `ComprobarIntentosBloqueados()` lanza un error que nombra `host:puerto` y vacía el registro — validates AC-08
- [ ] `test_bloqueo_desinstalado_es_error` — si una prueba reemplaza `connect`, `VerificarBloqueoInstalado()` da `false` — validates AC-08
- [ ] `test_instalacion_idempotente` — llamar dos veces a `InstalarBloqueoRed()` no duplica parches ni registros — validates AC-08
- [ ] Las 7 pruebas unitarias existentes pasan con el bloqueo instalado y sin `.env.local` — validates AC-07

**Completion criterion**
Las 11 pruebas pasan con `npm test`, `npm run lint` termina sin errores, y `npm test` pasa sin `.env.local` y sin variables `VITE_SUPABASE_*` en el entorno.

## Block 2 — Workflow de integración continua

**Files**
- `.github/workflows/ci.yml` (new) — el workflow. El nombre lo pidió el usuario.
- `src/integracionContinua.test.js` (new) — lee `ci.yml` como texto y verifica su contrato.
- `AGENTS.md` (modified) — ya contiene, sin commitear, `npm run test:integracion`, `npm run lint` y el marcador `daw:declined` de FEAT-002. Suma, en Code conventions, la regla de nombres de las pruebas requeridas (`test_…` en la spec y al inicio del título del `it(...)`).
- `src/bloqueoRedPruebas.test.js` y `src/integracionContinua.test.js` (modified) — el título de cada prueba requerida empieza con su identificador `test_…`.

**Logic**
Implementa FR-01 a FR-07. Contenido de `ci.yml`:
- `name: Integración Continua`.
- `on: pull_request` con los tipos por defecto (`opened`, `synchronize`, `reopened`), para que corra al abrir o actualizar un pull request (AC-01). Nunca `pull_request_target` (R-02).
- `permissions: contents: read` (R-02).
- `concurrency` con grupo `${{ github.workflow }}-${{ github.ref }}` y `cancel-in-progress: true` (R-04).
- Un job `verificar` en `ubuntu-latest`, con `timeout-minutes: 15` (R-04), sin `env` ni `continue-on-error`.
- Pasos, en este orden, todos con `name:` en español:
  1. `actions/checkout` fijada por el SHA completo de su última versión mayor estable, con comentario de versión y `persist-credentials: false` (R-01, R-02).
  2. `actions/setup-node` fijada por SHA de la misma forma, con `node-version: 22` y `cache: npm` (R-01, NFR-03).
  3. `run: npm ci` (AC-02).
  4. `run: npm run lint` (AC-03).
  5. `run: npm test` (AC-04, AC-07).
- Ningún paso `run` interpola `github.event.*` (R-03), y no hay `secrets.*` ni variables `VITE_SUPABASE_*` (AC-06, AC-07).

Los SHA se obtienen al implementar, de las releases oficiales de cada acción, con `gh api`.

`src/integracionContinua.test.js` lee el archivo con `readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')`, sin `__dirname`, y verifica el texto línea por línea. No agrega un parser YAML.

**Input validation**
- La prueba trata el contenido de `ci.yml` como texto: si el archivo no existe, la lectura lanza un error y la prueba falla.
- Cada `uses:` debe terminar en `@` seguido de 40 caracteres hexadecimales.
- `node-version` debe ser `22`.

**Error handling**
- Un paso (`npm ci`, `npm run lint` o `npm test`) termina con error: GitHub marca el job y la ejecución como fallidos en el pull request, porque no hay `continue-on-error` ni `|| true` (AC-05).
- `package-lock.json` desfasado de `package.json`: `npm ci` termina con error y la ejecución falla.
- Cambio en `ci.yml` que relaja el contrato (secretos, pruebas de integración, `continue-on-error`, etiqueta móvil, `pull_request_target`): la prueba unitaria falla.
- `ci.yml` inexistente: la prueba unitaria falla con error de lectura.

**Required tests**
- [ ] `test_ci_dispara_en_pull_request` — `on:` contiene `pull_request` — validates AC-01
- [ ] `test_ci_rechaza_pull_request_target` — `pull_request_target` está ausente; si aparece, error — validates AC-01
- [ ] `test_ci_instala_con_npm_ci` — existe un paso `run: npm ci` y no hay `npm install` — validates AC-02
- [ ] `test_ci_corre_lint_y_pruebas_en_orden` — `npm ci` aparece antes que `npm run lint`, y este antes que `npm test` — validates AC-03, AC-04
- [ ] `test_ci_sin_continue_on_error_ni_or_true` — un `continue-on-error` o un `|| true` es rechazado, porque ocultaría un error — validates AC-05
- [ ] `test_ci_sin_secretos_ni_credenciales` — `secrets.` y `VITE_SUPABASE` están ausentes; si aparecen, error — validates AC-06, AC-07
- [ ] `test_ci_sin_pruebas_de_integracion` — `test:integracion` y `--project integracion` son rechazados — validates AC-07
- [ ] `test_ci_acciones_fijadas_por_sha` — un `uses:` sin SHA de 40 caracteres es inválido — validates AC-06
- [ ] `test_ci_permisos_de_solo_lectura` — `contents: read` y `persist-credentials: false` presentes; `write` rechazado — validates AC-06
- [ ] `test_ci_sin_contexto_del_autor_en_run` — `github.event` dentro de un paso `run` es rechazado — validates AC-06
- [ ] `test_ci_node_22_y_timeout` — `node-version: 22` y `timeout-minutes` presentes; otra versión es inválida — validates AC-02
- [ ] `test_ci_archivo_faltante_es_error` — leer una ruta inexistente lanza error de lectura — validates AC-05

**Completion criterion**
Las 12 pruebas pasan con `npm test`, `npm run lint` termina sin errores, y la primera ejecución en un pull request real termina en verde.

## Final verification
- `npm ci`, `npm run lint` y `npm test` terminan sin errores en local, sin `.env.local`.
- `validate_spec.py --tier FEATURE` y `validate_threat.py` pasan sobre esta spec y su modelo de amenazas.
- Commits: el usuario pidió commitear `.github/workflows/ci.yml` solo, con el mensaje `ci: agrega workflow de tests y lint en cada PR`, y subir la rama `chore/ci`. Los demás archivos van en commits propios. Antes del push se muestran la rama y los comandos.
- Al abrir el pull request desde `chore/ci`, la ejecución aparece en el pull request y termina en verde (AC-01, AC-05).
