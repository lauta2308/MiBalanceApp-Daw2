# PRD FEAT-002: Integración continua en cada pull request

| Field | Value |
|-------|-------|
| Ticket | FEAT-002 |
| Tracker | none |
| Date | 2026-11-10T17:20:00Z |
| PRD loops | 2 |
| Loops since last human decision | 0 |

## Context and Problem

Hoy el repositorio no tiene ningún control automático sobre los pull requests. El linter y las pruebas solo corren si alguien los ejecuta en su máquina, así que un cambio con errores puede llegar a la revisión sin que nadie lo note.

Las pruebas de integración del proyecto van contra un servicio externo y necesitan credenciales, por lo que no pueden formar parte de este control.

Decisión del usuario (2026-11-10): además de correr solo las pruebas unitarias sin credenciales, se bloquea activamente la red dentro del proceso de esas pruebas. El bloqueo no afecta a nada fuera de ese proceso.

Decisión del usuario sobre W-PRD-06 (2026-11-10): FEAT-002 se mantiene como un solo ticket con 8 criterios de aceptación, porque dividirlo dejaría una parte de 7 criterios y otra de 1.

## Goals

- Que cada pull request reciba un resultado automático de linter y pruebas unitarias.
- Que ese control funcione sin credenciales y sin depender de servicios externos.

## Functional Requirements

- FR-01: El sistema de integración continua debe ejecutarse en cada pull request.
- FR-02: El sistema de integración continua debe instalar las dependencias declaradas por el repositorio.
- FR-03: El sistema de integración continua debe correr el linter con el comando declarado por el repositorio.
- FR-04: El sistema de integración continua debe correr las pruebas unitarias con el comando declarado por el repositorio.
- FR-05: El sistema de integración continua debe informar en el pull request si la ejecución falló.
- FR-06: La configuración de integración continua no debe contener secretos ni leerlos de ningún almacén.
- FR-07: Las pruebas ejecutadas por el sistema de integración continua no deben llamar a servicios externos.
- FR-08: El proceso de las pruebas unitarias debe rechazar todo intento de conexión a un servicio externo.

## Non-Functional Requirements

- NFR-01: La configuración de integración continua debe contener 0 secretos, claves o credenciales.
- NFR-02: La ejecución de pruebas debe realizar 0 llamadas a servicios externos.
- NFR-03: La ejecución debe usar una versión de Node 22.12 o superior dentro de la serie 22, la declarada por el proyecto.

## Acceptance Criteria

*(EARS — ver `.daw/rules/validation-rules.instructions.md` §1)*

- AC-01 (FR-01): WHEN se abre o se actualiza un pull request, THE sistema de integración continua SHALL iniciar una ejecución.
- AC-02 (FR-02): WHEN se inicia una ejecución, THE sistema de integración continua SHALL instalar las dependencias con las versiones fijadas en el archivo de bloqueo del repositorio.
- AC-03 (FR-03): WHEN la instalación de dependencias termina sin error, THE sistema de integración continua SHALL correr el linter con el comando `npm run lint`.
- AC-04 (FR-04): WHEN el linter termina sin error, THE sistema de integración continua SHALL correr las pruebas unitarias con el comando `npm test`.
- AC-05 (FR-05): IF la instalación, el linter o las pruebas terminan con error, THEN THE sistema de integración continua SHALL marcar la ejecución como fallida en el pull request.
- AC-06 (FR-06): THE configuración de integración continua SHALL contener 0 secretos y 0 referencias a un almacén de secretos.
- AC-07 (FR-07): WHILE la ejecución está en curso, THE sistema de integración continua SHALL correr solo las pruebas unitarias, sin las pruebas de integración y sin variables con credenciales de servicios externos.
- AC-08 (FR-08): IF una prueba unitaria intenta conectarse a un servicio externo sin simularlo, THEN THE proceso de las pruebas unitarias SHALL rechazar la conexión y marcar esa prueba como fallida.

## Out of Scope

- Correr las pruebas de integración (`npm run test:integracion`), porque van contra un servicio externo.
- Bloquear la red fuera del proceso de las pruebas unitarias: la instalación de dependencias, la aplicación y las pruebas de integración no cambian.
- Generar o publicar la aplicación, y desplegarla.
- Medir cobertura en la integración continua.
- Configurar reglas de protección de rama que impidan el merge cuando la ejecución falla.
- Correr las pruebas de navegador real.

## Risks and Mitigations

- Una prueba unitaria futura podría llamar a un servicio externo sin simularlo. Mitigación: el bloqueo activo de FR-08 hace fallar esa prueba.
- Una prueba unitaria actual podría depender de variables locales que no existen en la integración continua. Mitigación: comprobar en la fase de código que las pruebas pasan sin el archivo de entorno local.
- El linter podría reportar errores ya existentes en el repositorio y hacer fallar la primera ejecución. Mitigación: correrlo en la fase de código antes de cerrar el ticket.

## Dependencies

- GitHub Actions, como servicio que ejecuta la integración continua.
- Los comandos `npm run lint` y `npm test` declarados en `package.json`, y el archivo de bloqueo `package-lock.json`.
- La versión de Node declarada en `AGENTS.md`.
