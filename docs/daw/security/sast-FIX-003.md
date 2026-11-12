# SAST FIX-003

| Field | Value |
|-------|-------|
| Ticket | FIX-003 |
| Tools | revisión de código por modelo (diff), npm audit |
| Date | 2026-11-12 |

Alcance: el único cambio fuera de `docs/` es `.gitignore` (+2 líneas: `.vs/` y `coverage/`). `.vs/` solo contiene `slnx.sqlite` vacío, generado por Visual Studio. No hay cambios de código ni dependencias.

| Rule | Verdict | Notes |
|---|---|---|
| F-SAST-01 | ✅ | sin secretos en el diff; `.env`, `.env.local` y `.env.*.local` siguen en `.gitignore`. Ignorar `.vs/` y `coverage/` reduce el riesgo de commitear artefactos locales |
| F-SAST-02 | ✅ | sin consultas nuevas ni modificadas |
| F-SAST-03 | ✅ | sin `exec`, `spawn` ni `child_process` |
| F-SAST-04 | ✅ | sin `eval` ni deserialización |
| F-SAST-05 | ✅ | sin rutas de archivo con datos del usuario |
| F-SAST-06 | ✅ | sin cambios de interfaz |
| F-SAST-07 | ✅ | sin peticiones salientes nuevas |
| F-SAST-08 | ✅ | sin criptografía |
| F-SAST-09 | ✅ | sin cambios de configuración de ejecución |
| F-SAST-10 | ✅ | no se registra nada nuevo |
| F-SAST-11 | ✅ | no hay carga de archivos |
| F-SAST-12 | ✅ | sin formularios nuevos; la sesión viaja en el encabezado Authorization |
| F-SAST-13 | ✅ | `npm audit --omit=dev`: 0 vulnerabilidades; `npm audit`: 0 altas y 0 críticas |
| F-SAST-14 | ✅ | sin entradas nuevas |
| F-SAST-15 | ✅ | sin manejo de errores nuevo |
| F-SAST-16 | ⚠️ | Medium, preexistente: `minimatch` (GHSA-g3hv-75wg-m249) vía `eslint` y `@eslint/config-array` (dependencias de desarrollo), `package-lock.json:2620`; suprimido como riesgo aceptado, ver abajo. Sin dependencias nuevas en este ticket |
| F-SAST-17 | ✅ | sin rutas de código dinámico |

## Suppressions

### Suppression: F-SAST-16

| Field | Value |
|---|---|
| File | package-lock.json:2620 (`node_modules/minimatch`, requerido por `node_modules/eslint` y `node_modules/@eslint/config-array`, devDependencies) |
| Category | F-SAST-16 — CVE Medium en una dependencia (GHSA-g3hv-75wg-m249, denegación de servicio por amplificación de globparts) |
| Disposition | ACCEPTED_RISK |
| Reviewer | Lautaro (aceptado en FEAT-001a, FEAT-002 y FEAT-001b; renovado sin cambios por el orquestador en modo minimal en FEAT-001c, FEAT-001d y FIX-003) |
| Date | 2026-11-12 |
| Justification | Es el mismo hallazgo que el usuario aceptó en FEAT-001a (2026-11-09), FEAT-002 (2026-11-10) y FEAT-001b (2026-11-11), sin cambios: solo afecta a ESLint en desarrollo y CI, no a la app publicada (`npm audit --omit=dev` da 0). Los patrones que procesa vienen de `eslint.config.js`, que es código del repositorio. La única corrección disponible baja ESLint a la versión 9, y eso va contra la regla del proyecto de usar la última versión estable. |
| Compensating control | El job de CI tiene `timeout-minutes: 15` y un token de solo lectura, sin secretos. Un cambio a `eslint.config.js` se ve en la revisión del pull request, y `npm audit` se repite en cada ticket. |
| Review by | 2027-05-09, o antes si ESLint publica una versión que use `minimatch` 11.0.1 o superior |

Total: 16 clean, 0 vulnerabilities (0 critical, 0 high), 1 Medium suprimido
Result: PASSED
