# SAST FIX-001

| Field | Value |
|-------|-------|
| Ticket | FIX-001 |
| Tools | revisión de código por modelo, npm audit |
| Date | 2026-11-09 |

Alcance: el diff del ticket, que cambia una cadena de texto en `src/paginas/SeccionCuenta.jsx` y en su test, y la auditoría de dependencias.

| Rule | Verdict | Notes |
|---|---|---|
| F-SAST-01 | ✅ | el diff no agrega secretos |
| F-SAST-02 | ✅ | el diff no toca consultas |
| F-SAST-03 | ✅ | el diff no ejecuta comandos |
| F-SAST-04 | ✅ | el diff no deserializa ni evalúa código |
| F-SAST-05 | ✅ | el diff no usa rutas de archivo |
| F-SAST-06 | ✅ | el texto es fijo y se renderiza como texto de React |
| F-SAST-07 | ✅ | el diff no hace peticiones |
| F-SAST-08 | ✅ | el diff no usa criptografía |
| F-SAST-09 | ✅ | el diff no cambia la configuración |
| F-SAST-10 | ✅ | el diff no registra datos |
| F-SAST-11 | ✅ | no hay carga de archivos |
| F-SAST-12 | ✅ | el diff no agrega operaciones de escritura |
| F-SAST-13 | ✅ | `npm audit --audit-level=high`: 0 altas y 0 críticas |
| F-SAST-14 | ✅ | el diff no recibe datos del usuario |
| F-SAST-15 | ✅ | el diff no cambia el manejo de errores |
| F-SAST-16 | ⚠️ | Medium: GHSA-g3hv-75wg-m249 en `minimatch` 10.2.6, solo en la cadena de desarrollo de ESLint — package-lock.json:2590 (suprimido, ver abajo) |
| F-SAST-17 | ✅ | sin funciones inseguras |

## Suppressions

### Suppression: F-SAST-16

| Field | Value |
|---|---|
| File | package-lock.json:2590 |
| Category | Medium CVE in a dependency (GHSA-g3hv-75wg-m249, minimatch) |
| Disposition | ACCEPTED_RISK |
| Reviewer | Lautaro |
| Date | 2026-11-09 |
| Justification | Riesgo ya aceptado por el usuario en FEAT-001a. La dependencia solo la usa ESLint como herramienta de desarrollo; no entra en el build ni en producción (`npm audit --omit=dev` da 0). |
| Compensating control | ESLint no procesa entradas externas ni corre en producción; `npm audit` se repite en cada ticket. |
| Review by | 2027-05-09 |

Total: 16 clean, 1 suppressed, 0 vulnerabilities (0 critical, 0 high)
Result: PASSED
