# PRD FEAT-004: Dependabot semanal para npm y github-actions

| Field | Value |
|-------|-------|
| Ticket | FEAT-004 |
| Tracker | none |
| Date | 2026-11-13T03:10:00Z |
| PRD loops | 0 |
| Loops since last human decision | 0 |

## Context and Problem

Las dependencias de la aplicación (npm) y las acciones del workflow de integración continua se actualizan solo cuando alguien lo hace a mano. Las acciones están fijadas por SHA, así que nunca reciben una versión nueva por sí solas, y una dependencia puede quedar varias versiones atrás sin que nadie lo note.

El repositorio ya tiene activadas las alertas de vulnerabilidades y las actualizaciones de seguridad automáticas, que abren un pull request apenas se publica una vulnerabilidad. Este ticket no las cambia: agrega las actualizaciones de versión periódicas.

Decisiones del usuario (2026-11-13):

- Se revisan dos ecosistemas: las dependencias npm de la raíz del repositorio y las acciones del workflow de integración continua.
- La revisión es semanal.
- No debe inundar de pull requests: cada ecosistema junta todas sus actualizaciones en un solo pull request por semana, como máximo 2 por semana en total.

Gestor verificado en el repositorio: npm, con `package.json` y `package-lock.json` en la raíz. No hay manifiestos de otros gestores.

## Goals

- Que las dependencias npm y las acciones del CI reciban propuestas de actualización sin trabajo manual.
- Que esas propuestas lleguen como máximo en 2 pull requests por semana.

## Functional Requirements

- FR-01: El sistema de actualización automática debe revisar las dependencias npm declaradas en la raíz del repositorio.
- FR-02: El sistema de actualización automática debe revisar las acciones usadas por los workflows del repositorio.
- FR-03: Cada revisión debe ejecutarse una vez por semana.
- FR-04: El sistema debe juntar todas las actualizaciones de un mismo ecosistema en un único pull request.
- FR-05: El sistema no debe tener abierto más de un pull request de actualización de versión por ecosistema al mismo tiempo.
- FR-06: Las actualizaciones de acciones fijadas por SHA deben conservar la fijación por SHA.

## Non-Functional Requirements

- NFR-01: El sistema debe abrir como máximo 2 pull requests de actualización de versión por semana.
- NFR-02: La configuración debe contener 0 secretos, claves o credenciales.

## Acceptance Criteria

*(EARS — ver `.daw/rules/validation-rules.instructions.md` §1)*

- AC-01 (FR-01): WHEN se ejecuta la revisión semanal, THE sistema de actualización automática SHALL revisar las dependencias declaradas en `package.json` y `package-lock.json` de la raíz.
- AC-02 (FR-02): WHEN se ejecuta la revisión semanal, THE sistema de actualización automática SHALL revisar las acciones usadas en `.github/workflows/`.
- AC-03 (FR-03): THE configuración SHALL declarar una frecuencia semanal para cada uno de los dos ecosistemas.
- AC-04 (FR-04): WHEN una revisión encuentra varias actualizaciones en un ecosistema, THE sistema SHALL proponerlas todas en un único pull request.
- AC-05 (FR-05): WHILE hay un pull request de actualización de versión abierto para un ecosistema, THE sistema SHALL actualizar ese pull request en lugar de abrir otro para el mismo ecosistema.
- AC-06 (FR-06): WHEN el sistema propone una versión nueva de una acción fijada por SHA, THE pull request SHALL reemplazar el SHA por el de la versión nueva y no por una etiqueta.
- AC-07 (FR-04): IF la configuración no es válida, THEN THE sistema de actualización automática SHALL informar el error en la pestaña de dependencias del repositorio y no abrir pull requests.

## Out of Scope

- Cambiar las alertas de vulnerabilidades o las actualizaciones de seguridad automáticas, que ya están activadas y siguen abriendo pull requests fuera del ciclo semanal.
- Mergear automáticamente los pull requests de actualización.
- Revisar dependencias de las herramientas internas del flujo de trabajo (`.daw/`, `.claude/`), que no declaran manifiestos.
- Separar las actualizaciones mayores en pull requests propios.
- Agregar o cambiar etiquetas, revisores o asignados de los pull requests.

## Risks and Mitigations

- Una actualización mayor dentro del pull request agrupado puede romper el CI y frenar también las menores de esa semana. Mitigación: el CI de cada pull request lo detecta; se puede excluir esa dependencia o bajar la versión en ese pull request. Separar las mayores queda fuera de alcance porque sumaría pull requests.
- Las actualizaciones de seguridad no respetan el límite semanal y pueden sumar pull requests. Mitigación: es el comportamiento deseado para vulnerabilidades y queda fuera del límite de NFR-01.
- Un cambio en el workflow de integración continua que propone el sistema podría relajar su contrato. Mitigación: la prueba de contrato de `ci.yml` (FEAT-002) corre en ese pull request.

## Dependencies

- Dependabot de GitHub, con las alertas de vulnerabilidades y las actualizaciones de seguridad ya activadas.
- El workflow de integración continua de FEAT-002 y su prueba de contrato.
- `package.json` y `package-lock.json` de la raíz.
