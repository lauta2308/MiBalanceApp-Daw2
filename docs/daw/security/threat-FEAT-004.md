# Threat model FEAT-004: Dependabot semanal para npm y github-actions

| Field | Value |
|-------|-------|
| Ticket | FEAT-004 |
| Spec | docs/daw/specs/spec-FEAT-004.md |
| Tier | FEATURE |
| Date | 2026-11-13 |

## Components
| Component | Source in the spec |
|---|---|
| `.github/dependabot.yml` | Block 1 |
| `src/dependabot.test.js` | Block 1 |

## Trust boundaries
- Registro de npm y releases de acciones de GitHub → pull request de Dependabot: versiones publicadas por terceros entran al repositorio como cambios en `package.json`, `package-lock.json` y `.github/workflows/ci.yml`.
- Pull request de Dependabot → runner de GitHub Actions: el workflow `ci.yml` instala y ejecuta el código de las versiones nuevas (`npm ci`, `npm run lint`, `npm test`).
- Pull request de Dependabot → rama `main`: el cambio solo entra si una persona lo mergea.

## STRIDE analysis
### `.github/dependabot.yml`
- **Spoofing:** un paquete con nombre parecido (typosquatting) no entra por esta vía: Dependabot solo propone versiones nuevas de las dependencias ya declaradas en `package.json` y de las acciones ya usadas en `ci.yml`, nunca agrega paquetes.
- **Tampering:** una versión nueva comprometida de una dependencia o de una acción podría llegar en el pull request agrupado; no hay merge automático, el pull request pasa por el CI y por revisión humana (R-01). Las acciones siguen fijadas por SHA en la versión nueva (R-02).
- **Repudiation:** cada pull request queda firmado por la cuenta `dependabot[bot]`, con la lista de versiones, las notas de release y el historial de commits de cada dependencia.
- **Information Disclosure:** la configuración no declara registros privados ni secretos; los workflows disparados por Dependabot reciben un token de solo lectura y no acceden a los secretos de Actions (R-03).
- **Denial of Service:** una avalancha de pull requests saturaría la revisión; se agrupan las actualizaciones en un pull request por ecosistema y se limita a 1 abierto por ecosistema, como máximo 2 por semana (R-04).
- **Elevation of Privilege:** un script de instalación malicioso en una versión nueva corre en el runner con los permisos de `ci.yml` (`contents: read`, `persist-credentials: false`, sin secretos), sin privilegios que escalar (R-03).

### `src/dependabot.test.js`
- **Spoofing:** no aplica identidad: la prueba lee un archivo del propio repositorio por una ruta fija relativa al módulo, sin entrada externa.
- **Tampering:** un cambio que relaje la configuración (otra frecuencia, sin grupos, sin límite, un registro con credenciales) hace fallar la prueba en el CI (R-05).
- **Repudiation:** el resultado de la prueba queda en la salida de la ejecución del CI de cada pull request.
- **Information Disclosure:** la prueba solo lee `.github/dependabot.yml`, que no contiene datos sensibles, y no abre conexiones de red (el bloqueo de FEAT-002 lo impediría).
- **Denial of Service:** lee un archivo chico una vez por prueba; no agrega esperas ni bucles.
- **Elevation of Privilege:** corre dentro del proceso de pruebas unitarias sin permisos adicionales.

## Data classification
| Data | Class | At rest | In transit |
|---|---|---|---|
| `GITHUB_TOKEN` de un workflow disparado por Dependabot | credentials | no se persiste: `persist-credentials: false`, y GitHub lo revoca al terminar el job | TLS hacia la API de GitHub |
| Contenido de `.github/dependabot.yml` | public | repositorio de GitHub | TLS en el checkout |
| Versiones y notas de release propuestas | public | rama del pull request de Dependabot | TLS entre GitHub y los registros |

## Risks and mitigations
| ID | Risk | STRIDE | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R-01 | versión nueva comprometida de una dependencia o una acción | T | L | H | sin merge automático: el pull request pasa por el CI y por revisión humana antes de entrar a `main` |
| R-02 | acción actualizada a una etiqueta móvil en lugar de un SHA | T | L | H | Dependabot conserva el formato SHA + comentario de versión; la prueba `test_ci_acciones_fijadas_por_sha` de FEAT-002 corre en ese pull request y falla si no |
| R-03 | script de instalación que exfiltra secretos | I | L | M | la configuración no declara registros ni secretos; el CI corre con `contents: read`, sin secretos y sin credenciales persistidas |
| R-04 | avalancha de pull requests que satura la revisión | D | M | L | un grupo con `"*"` por ecosistema, `interval: weekly` y `open-pull-requests-limit: 1` |
| R-05 | cambio futuro que relaja la configuración | T | L | M | `src/dependabot.test.js` verifica el contrato en cada `npm test` |

## Supply chain
No se agregan dependencias de npm ni acciones nuevas. El propio Dependabot es el canal por el que entran versiones de terceros: el control es que nada se mergea sin CI y revisión humana (R-01), y que las acciones siguen fijadas por SHA (R-02). Las actualizaciones de seguridad ya activadas no cambian.

## Availability
El vector es la cantidad de pull requests, que consume tiempo de revisión y minutos del CI; lo acotan la agrupación, la frecuencia semanal y el límite de 1 pull request abierto por ecosistema (R-04).
