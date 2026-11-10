# Threat model FEAT-002: Integración continua en cada pull request

| Field | Value |
|-------|-------|
| Ticket | FEAT-002 |
| Spec | docs/daw/specs/spec-FEAT-002.md |
| Tier | FEATURE |
| Date | 2026-11-10 |

## Components
| Component | Source in the spec |
|---|---|
| `src/bloqueoRedPruebas.js` | Block 1 |
| `.github/workflows/ci.yml` | Block 2 |

## Trust boundaries
- Autor del pull request → runner de GitHub Actions: el código del pull request, incluido el de un fork, se ejecuta en el runner (`npm ci`, `npm run lint`, `npm test`).
- Runner → registro de npm: `npm ci` descarga paquetes de terceros y ejecuta sus scripts de instalación.
- Runner → acciones de terceros: `actions/checkout` y `actions/setup-node` se descargan de GitHub y corren con el token del job.
- Proceso de pruebas unitarias → red externa: el código bajo prueba podría abrir conexiones TCP, TLS, UDP o XHR síncronas hacia internet.

## STRIDE analysis
### `.github/workflows/ci.yml`
- **Spoofing:** una acción referenciada por etiqueta móvil (`@v4`) podría ser reemplazada por otro contenido con el mismo nombre; se fija cada acción por el SHA completo de su commit, con la versión en un comentario (R-01).
- **Tampering:** el código de un pull request podría usar el token del job para escribir en el repositorio; el workflow declara `permissions: contents: read`, usa el evento `pull_request` y nunca `pull_request_target`, y `actions/checkout` corre con `persist-credentials: false` para no dejar el token guardado en la configuración de git (R-02).
- **Repudiation:** cada ejecución queda registrada por GitHub con el SHA del commit, el autor del pull request y la salida de cada paso.
- **Information Disclosure:** no hay secretos que filtrar: el workflow no lee `secrets.*` ni define variables `VITE_SUPABASE_*`, y a los pull requests desde forks GitHub no les entrega secretos. Ningún paso `run` interpola contexto controlado por el autor (`github.event.pull_request.*`), lo que evita la inyección de comandos (R-03).
- **Denial of Service:** una prueba colgada o un bucle podría ocupar el runner indefinidamente; el job tiene `timeout-minutes: 15`, y `concurrency` con `cancel-in-progress` cancela la ejecución anterior del mismo pull request (R-04).
- **Elevation of Privilege:** un script de instalación de una dependencia comprometida corre con los mismos permisos que el job; con token de solo lectura, sin credenciales persistidas y sin secretos, no tiene privilegios que escalar (R-05).

### `src/bloqueoRedPruebas.js`
- **Spoofing:** un host como `127.0.0.1.ejemplo.com` o `localhost.ejemplo.com` podría hacerse pasar por loopback; la comparación es exacta (`localhost`, `127.0.0.0/8`, `::1`, `::ffff:127.x.x.x`, socket local por ruta) y nunca por prefijo (R-06).
- **Tampering:** una prueba podría restaurar `net.Socket.prototype.connect` y saltear el bloqueo; después de cada prueba se verifica que los parches sigan instalados y, si no, la prueba falla (R-07).
- **Repudiation:** cada intento rechazado queda registrado con el host, el puerto y el nombre de la prueba, y el mensaje de fallo los muestra.
- **Information Disclosure:** el bloqueo impide que una prueba envíe variables del entorno o datos del runner a un servidor externo; el registro guarda solo host y puerto, nunca el contenido de la conexión (R-08).
- **Denial of Service:** el rechazo es inmediato y no espera a un timeout de red, así que no alarga la ejecución.
- **Elevation of Privilege:** el parche vive solo dentro del proceso de pruebas unitarias; no cambia permisos del sistema, del runner ni de otros procesos.

## Data classification
| Data | Class | At rest | In transit |
|---|---|---|---|
| `GITHUB_TOKEN` del job | credentials | no se persiste: `persist-credentials: false`, y GitHub lo revoca al terminar el job | TLS hacia la API de GitHub |
| Código fuente del pull request | public | repositorio de GitHub | TLS en el checkout |
| Host y puerto de un intento rechazado | public | solo en la salida de la ejecución | no sale del runner |

## Risks and mitigations
| ID | Risk | STRIDE | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-01 | acción de terceros reemplazada bajo la misma etiqueta | S | L | H | fijar `actions/checkout` y `actions/setup-node` por SHA completo de su última versión mayor estable |
| R-02 | pull request que escribe en el repositorio con el token | T | M | H | `permissions: contents: read`, evento `pull_request`, `persist-credentials: false` |
| R-03 | inyección de comandos por título o rama del pull request | I | L | H | ningún paso `run` interpola `github.event.*` |
| R-04 | ejecución colgada que ocupa el runner | D | M | L | `timeout-minutes: 15` y `concurrency` con `cancel-in-progress` |
| R-05 | script de instalación malicioso en una dependencia | E | L | M | token de solo lectura, sin secretos ni credenciales persistidas; `npm ci` instala solo lo fijado en `package-lock.json` |
| R-06 | host externo que pasa como loopback | S | L | M | comparación exacta de hosts, con pruebas para los casos de prefijo |
| R-07 | prueba que desinstala el bloqueo | T | L | M | verificación después de cada prueba de que los parches siguen instalados |
| R-08 | prueba que exfiltra datos del runner | I | L | M | rechazo de toda conexión externa por TCP, TLS, UDP y XHR síncrono |

## Supply chain
No se agregan dependencias de npm. Se incorporan dos acciones de GitHub (`actions/checkout`, `actions/setup-node`), las dos mantenidas por GitHub y fijadas por SHA (R-01). Las dependencias de npm existentes se instalan con `npm ci` desde `package-lock.json` (R-05).

## Availability
El vector es una ejecución que no termina; lo acotan el timeout del job y la cancelación de ejecuciones anteriores del mismo pull request (R-04). El bloqueo de red rechaza al instante y no agrega esperas.
