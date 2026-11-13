# SAST FIX-004

| Field | Value |
|-------|-------|
| Ticket | FIX-004 |
| Tools | revisión de código por modelo con búsqueda de patrones (grep), npm audit |
| Date | 2026-11-13 |

Alcance: los archivos que la rama `fix/FIX-004-agents-date-fns` cambia fuera de `docs/` respecto de `main`: solo `AGENTS.md`:9, una línea de documentación del Stack. No hay código de la aplicación, pruebas, migraciones, configuración ni cambios en `package.json` o `package-lock.json`.

| Rule | Verdict | Notes |
|---|---|---|
| F-SAST-01 | ✅ | la línea cambiada no contiene claves ni tokens; `.env`, `.env.local` y `.env.*.local` siguen en `.gitignore` |
| F-SAST-02 | ✅ | sin consultas SQL ni NoSQL en el cambio |
| F-SAST-03 | ✅ | sin `exec`, `spawn` ni `child_process` en el cambio |
| F-SAST-04 | ✅ | sin `eval` ni deserialización; el cambio es texto Markdown |
| F-SAST-05 | ✅ | sin rutas de archivos construidas con datos externos |
| F-SAST-06 | ✅ | sin salida HTML; `AGENTS.md` no se publica con la app |
| F-SAST-07 | ✅ | sin peticiones salientes |
| F-SAST-08 | ✅ | sin criptografía |
| F-SAST-09 | ✅ | sin modo de depuración ni `console.*` |
| F-SAST-10 | ✅ | no se registra nada |
| F-SAST-11 | ✅ | no hay carga de archivos |
| F-SAST-12 | ✅ | sin formularios ni cookies |
| F-SAST-13 | ✅ | `npm audit --omit=dev`: 0 vulnerabilidades; `npm audit`: 0 altas y 0 críticas |
| F-SAST-14 | ✅ | el cambio no recibe entrada |
| F-SAST-15 | ✅ | el cambio no maneja errores |
| F-SAST-16 | ⚠️ | Medium, preexistente: `minimatch` (GHSA-g3hv-75wg-m249) vía `eslint` y `@eslint/config-array` (dependencias de desarrollo), `package-lock.json:2638`; suprimido como riesgo aceptado, ver abajo. Sin dependencias nuevas en este ticket |
| F-SAST-17 | ✅ | sin funciones inseguras ni rutas de código dinámico |

## Suppressions

### Suppression: F-SAST-16

| Field | Value |
|---|---|
| File | package-lock.json:2638 (`node_modules/minimatch`, requerido por `node_modules/eslint` y `node_modules/@eslint/config-array`, devDependencies) |
| Category | F-SAST-16 — CVE Medium en una dependencia (GHSA-g3hv-75wg-m249, denegación de servicio por amplificación de globparts) |
| Disposition | ACCEPTED_RISK |
| Reviewer | Lautaro (aceptado en FEAT-001a, FEAT-002 y FEAT-001b; renovado sin cambios por el orquestador en modo minimal en FEAT-001c, FEAT-001d, FEAT-001e, FEAT-004 y FIX-004) |
| Date | 2026-11-13 |
| Justification | Es el mismo hallazgo que el usuario aceptó en FEAT-001a (2026-11-09), FEAT-002 (2026-11-10) y FEAT-001b (2026-11-11), sin cambios: solo afecta a ESLint en desarrollo y CI, no a la app publicada (`npm audit --omit=dev` da 0). Los patrones que procesa vienen de `eslint.config.js`, que es código del repositorio. La única corrección disponible baja ESLint a la versión 9, y eso va contra la regla del proyecto de usar la última versión estable. |
| Compensating control | El job de CI tiene `timeout-minutes: 15` y un token de solo lectura, sin secretos. Dependabot propone cada semana las versiones nuevas de ESLint y sus dependencias (la tanda del PR #20 no la trajo todavía), así que el arreglo llega como pull request en cuanto exista. `npm audit` se repite en cada ticket. |
| Review by | 2027-05-09, o antes si ESLint publica una versión que use `minimatch` 11.0.1 o superior |

Total: 16 clean, 0 vulnerabilities (0 critical, 0 high), 1 Medium suprimido
Result: PASSED
