import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// La ruta va en una constante y no como literal dentro de `new URL(…)`: Vite reescribe
// `new URL('literal', import.meta.url)` como la URL de un recurso servido
// (http://localhost:3000/…), y readFileSync la rechaza por no ser file://.
const rutaRelativaCi = '../.github/workflows/ci.yml'
const rutaRelativaInexistente = '../.github/workflows/no-existe.yml'
const rutaRelativaPaquete = '../package.json'
const rutaCi = new URL(rutaRelativaCi, import.meta.url)
const rutaPaquete = new URL(rutaRelativaPaquete, import.meta.url)

function LeerCi() {
  return readFileSync(rutaCi, 'utf8')
}

function LeerPaquete() {
  return JSON.parse(readFileSync(rutaPaquete, 'utf8'))
}

function ObtenerLineas(texto) {
  return texto.split(/\r?\n/)
}

function ObtenerSangria(linea) {
  return linea.length - linea.trimStart().length
}

// Devuelve el comando de cada paso `run`, incluidos los de bloque (`run: |`).
function ObtenerComandosRun(texto) {
  const lineas = ObtenerLineas(texto)
  const comandos = []
  for (let indice = 0; indice < lineas.length; indice++) {
    const coincidencia = lineas[indice].match(/^(\s*)(?:-\s+)?run:\s*(.*)$/)
    if (!coincidencia) continue
    const valor = coincidencia[2].trim()
    if (valor === '' || /^[|>][-+]?$/.test(valor)) {
      const sangriaRun = ObtenerSangria(lineas[indice])
      const partes = []
      while (indice + 1 < lineas.length) {
        const siguiente = lineas[indice + 1]
        if (siguiente.trim() !== '' && ObtenerSangria(siguiente) <= sangriaRun) break
        partes.push(siguiente.trim())
        indice++
      }
      comandos.push(partes.join('\n').trim())
    } else {
      comandos.push(valor)
    }
  }
  return comandos
}

// Devuelve las líneas con más sangría que siguen a la clave `clave:` de primer nivel.
function ObtenerBloque(texto, clave) {
  const lineas = ObtenerLineas(texto)
  const indiceClave = lineas.findIndex((linea) => new RegExp(`^${clave}:`).test(linea))
  if (indiceClave === -1) return null
  const bloque = [lineas[indiceClave].slice(clave.length + 1).trim()]
  for (let indice = indiceClave + 1; indice < lineas.length; indice++) {
    if (lineas[indice].trim() !== '' && ObtenerSangria(lineas[indice]) === 0) break
    bloque.push(lineas[indice])
  }
  return bloque
}

function VerificarDisparoPullRequest(texto) {
  const bloque = ObtenerBloque(texto, 'on')
  if (!bloque) throw new Error('Falta la clave "on:".')
  const enLinea = /(^|[\s[,])pull_request($|[\s\],:])/.test(bloque[0])
  const enBloque = bloque.slice(1).some((linea) => /^\s+-?\s*pull_request:?\s*$/.test(linea))
  if (!enLinea && !enBloque) throw new Error('El workflow no dispara en "pull_request".')
}

function VerificarSinPullRequestTarget(texto) {
  if (/pull_request_target/.test(texto)) throw new Error('Se usa "pull_request_target".')
}

function VerificarInstalacionConNpmCi(texto) {
  const comandos = ObtenerComandosRun(texto)
  if (!comandos.includes('npm ci')) throw new Error('Falta el paso "run: npm ci".')
  if (/\bnpm\s+(install|i|add)\b/.test(texto)) throw new Error('Se usa "npm install".')
}

function VerificarOrdenDeComandos(texto) {
  const comandos = ObtenerComandosRun(texto)
  const orden = ['npm ci', 'npm run lint', 'npm test'].map((comando) => comandos.indexOf(comando))
  if (orden.includes(-1)) throw new Error('Falta alguno de los pasos npm ci, npm run lint o npm test.')
  if (!(orden[0] < orden[1] && orden[1] < orden[2])) {
    throw new Error('Los pasos no siguen el orden npm ci, npm run lint, npm test.')
  }
}

function VerificarSinOcultarErrores(texto) {
  if (/continue-on-error/.test(texto)) throw new Error('Se usa "continue-on-error".')
  if (/\|\|\s*true\b/.test(texto)) throw new Error('Se usa "|| true".')
}

function VerificarSinSecretos(texto) {
  if (/secrets\./.test(texto)) throw new Error('Se lee "secrets.".')
  if (/VITE_SUPABASE/.test(texto)) throw new Error('Se define "VITE_SUPABASE".')
  if (/^\s*env:/m.test(texto)) throw new Error('Se definen variables con "env:".')
}

const expresionProyectoIntegracion = /--project[\s=]+['"]?integracion\b/
const expresionProyectoUnidad = /--project[\s=]+['"]?unidad['"]?(\s|$)/

function VerificarSinPruebasDeIntegracion(texto) {
  if (/test:integracion/.test(texto)) throw new Error('Se corre "test:integracion".')
  if (expresionProyectoIntegracion.test(texto)) throw new Error('Se corre "--project integracion".')
  for (const comando of ObtenerComandosRun(texto)) {
    if (/\bvitest\b/.test(comando) && !expresionProyectoUnidad.test(comando)) {
      throw new Error(`Un paso "run" invoca vitest sin "--project unidad": ${comando}`)
    }
  }
}

function VerificarAccionesPorSha(texto) {
  const lineasUses = ObtenerLineas(texto).filter((linea) => /^\s*(-\s+)?uses:/.test(linea))
  if (lineasUses.length === 0) throw new Error('No hay pasos "uses:".')
  for (const linea of lineasUses) {
    if (!/uses:\s*[\w.-]+\/[\w./-]+@[0-9a-f]{40}\s+#\s*v\d+(\.\d+)*\s*$/.test(linea)) {
      throw new Error(`Acción sin SHA de 40 caracteres y versión en comentario: ${linea.trim()}`)
    }
  }
}

function VerificarPermisosDeSoloLectura(texto) {
  const bloque = ObtenerBloque(texto, 'permissions')
  if (!bloque || !bloque.slice(1).some((linea) => /^\s+contents:\s*read\s*$/.test(linea))) {
    throw new Error('Falta "permissions: contents: read".')
  }
  if (!/^\s*persist-credentials:\s*false\s*$/m.test(texto)) {
    throw new Error('Falta "persist-credentials: false".')
  }
  if (/:\s*write\b|write-all/.test(texto)) throw new Error('Se otorga permiso de escritura.')
}

// Cualquier expresión `${{ … }}` dentro de un `run` se rechaza: github.event.*, github.head_ref
// y otras son texto que controla el autor del pull request y se pegan en el script sin escapar.
function VerificarSinContextoDelAutorEnRun(texto) {
  for (const comando of ObtenerComandosRun(texto)) {
    if (/\$\{\{/.test(comando)) throw new Error(`Un paso "run" interpola una expresión \${{ }}: ${comando}`)
  }
}

function VerificarScriptTestSoloUnidad(paquete) {
  const scriptTest = paquete?.scripts?.test
  if (typeof scriptTest !== 'string') throw new Error('Falta scripts.test en package.json.')
  if (!expresionProyectoUnidad.test(scriptTest)) {
    throw new Error(`scripts.test no corre "--project unidad": ${scriptTest}`)
  }
  if (expresionProyectoIntegracion.test(scriptTest)) {
    throw new Error(`scripts.test corre también el proyecto integracion: ${scriptTest}`)
  }
}

function VerificarCancelacionDeEjecuciones(texto) {
  const bloque = ObtenerBloque(texto, 'concurrency')
  if (!bloque) throw new Error('Falta la clave "concurrency:".')
  const grupoEsperado = /^\s+group:\s*\$\{\{\s*github\.workflow\s*\}\}-\$\{\{\s*github\.ref\s*\}\}\s*$/
  if (!bloque.slice(1).some((linea) => grupoEsperado.test(linea))) {
    throw new Error('Falta "group: ${{ github.workflow }}-${{ github.ref }}" en concurrency.')
  }
  if (!bloque.slice(1).some((linea) => /^\s+cancel-in-progress:\s*true\s*$/.test(linea))) {
    throw new Error('Falta "cancel-in-progress: true" en concurrency.')
  }
}

function VerificarRunnerDeGithub(texto) {
  if (/self-hosted/.test(texto)) throw new Error('Se usa un runner "self-hosted".')
  const runners = [...texto.matchAll(/^\s*runs-on:\s*(.*?)\s*$/gm)].map((coincidencia) => coincidencia[1])
  if (runners.length === 0) throw new Error('Falta "runs-on".')
  for (const runner of runners) {
    if (runner !== 'ubuntu-latest') throw new Error(`runs-on debe ser ubuntu-latest: ${runner}`)
  }
}

function VerificarNode22YTimeout(texto) {
  const versiones = [...texto.matchAll(/^\s*node-version:\s*['"]?([^'"\s#]+)['"]?\s*(#.*)?$/gm)]
  if (versiones.length === 0) throw new Error('Falta "node-version".')
  for (const version of versiones) {
    if (version[1] !== '22') throw new Error(`node-version inválida: ${version[1]}`)
  }
  if (!/^\s*timeout-minutes:\s*15\s*$/m.test(texto)) throw new Error('Falta "timeout-minutes: 15".')
}

const ciDeEjemploValido = `name: Ejemplo
on: pull_request
permissions:
  contents: read
concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true
jobs:
  verificar:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Obtener
        uses: actions/checkout@${'a'.repeat(40)} # v1.0.0
        with:
          persist-credentials: false
      - name: Node
        uses: actions/setup-node@${'b'.repeat(40)} # v2.0.0
        with:
          node-version: 22
      - name: Instalar
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Probar
        run: npm test
`

function Reemplazar(buscado, reemplazo) {
  const resultado = ciDeEjemploValido.replace(buscado, reemplazo)
  if (resultado === ciDeEjemploValido) throw new Error(`El ejemplo no contiene ${buscado}`)
  return resultado
}

describe('integración continua', () => {
  it('test_ci_dispara_en_pull_request: on contiene pull_request', () => {
    expect(() => VerificarDisparoPullRequest(LeerCi())).not.toThrow()
    expect(() => VerificarDisparoPullRequest(ciDeEjemploValido)).not.toThrow()
    expect(() => VerificarDisparoPullRequest(Reemplazar('on: pull_request', 'on: push'))).toThrow(/pull_request/)
  })

  it('test_ci_rechaza_pull_request_target: pull_request_target está ausente', () => {
    expect(() => VerificarSinPullRequestTarget(LeerCi())).not.toThrow()
    expect(() =>
      VerificarSinPullRequestTarget(Reemplazar('on: pull_request', 'on: pull_request_target')),
    ).toThrow(/pull_request_target/)
  })

  it('test_ci_instala_con_npm_ci: hay un paso npm ci y no hay npm install', () => {
    expect(() => VerificarInstalacionConNpmCi(LeerCi())).not.toThrow()
    expect(() => VerificarInstalacionConNpmCi(Reemplazar('run: npm ci', 'run: npm install'))).toThrow()
    expect(() =>
      VerificarInstalacionConNpmCi(Reemplazar('run: npm run lint', 'run: npm install && npm run lint')),
    ).toThrow(/npm install/)
  })

  it('test_ci_corre_lint_y_pruebas_en_orden: npm ci, luego npm run lint, luego npm test', () => {
    expect(() => VerificarOrdenDeComandos(LeerCi())).not.toThrow()
    const desordenado = ciDeEjemploValido
      .replace('run: npm run lint', 'run: TEMPORAL')
      .replace('run: npm test', 'run: npm run lint')
      .replace('run: TEMPORAL', 'run: npm test')
    expect(() => VerificarOrdenDeComandos(desordenado)).toThrow(/orden/)
    expect(() => VerificarOrdenDeComandos(Reemplazar('        run: npm test\n', ''))).toThrow(/Falta/)
  })

  it('test_ci_sin_continue_on_error_ni_or_true: se rechaza lo que oculta un error', () => {
    expect(() => VerificarSinOcultarErrores(LeerCi())).not.toThrow()
    expect(() =>
      VerificarSinOcultarErrores(
        Reemplazar('        run: npm test\n', '        run: npm test\n        continue-on-error: true\n'),
      ),
    ).toThrow(/continue-on-error/)
    expect(() => VerificarSinOcultarErrores(Reemplazar('run: npm test', 'run: npm test || true'))).toThrow(
      /\|\| true/,
    )
  })

  it('test_ci_sin_secretos_ni_credenciales: secrets. y VITE_SUPABASE están ausentes', () => {
    expect(() => VerificarSinSecretos(LeerCi())).not.toThrow()
    expect(() =>
      VerificarSinSecretos(
        Reemplazar('        run: npm test\n', '        run: npm test\n        env:\n          CLAVE: ${{ secrets.CLAVE }}\n'),
      ),
    ).toThrow(/secrets/)
    expect(() =>
      VerificarSinSecretos(Reemplazar('run: npm test', 'run: VITE_SUPABASE_URL=https://x npm test')),
    ).toThrow(/VITE_SUPABASE/)
  })

  it('test_ci_sin_pruebas_de_integracion: test:integracion, --project integracion y vitest sin --project unidad son rechazados', () => {
    expect(() => VerificarSinPruebasDeIntegracion(LeerCi())).not.toThrow()
    expect(() =>
      VerificarSinPruebasDeIntegracion(Reemplazar('run: npm test', 'run: npm run test:integracion')),
    ).toThrow(/test:integracion/)
    expect(() =>
      VerificarSinPruebasDeIntegracion(Reemplazar('run: npm test', 'run: npx vitest run --project integracion')),
    ).toThrow(/--project integracion/)
    expect.soft(() =>
      VerificarSinPruebasDeIntegracion(Reemplazar('run: npm test', 'run: npx vitest run --project "integracion"')),
    ).toThrow(/--project integracion/)
    expect.soft(() =>
      VerificarSinPruebasDeIntegracion(Reemplazar('run: npm test', 'run: npx vitest run')),
    ).toThrow(/vitest sin "--project unidad"/)
    expect.soft(() =>
      VerificarSinPruebasDeIntegracion(Reemplazar('run: npm test', 'run: npx vitest run --project unidad')),
    ).not.toThrow()
  })

  it('test_npm_test_corre_solo_unidad: scripts.test de package.json corre solo el proyecto unidad', () => {
    expect(() => VerificarScriptTestSoloUnidad(LeerPaquete())).not.toThrow()
    expect.soft(() => VerificarScriptTestSoloUnidad({ scripts: { test: 'vitest run' } })).toThrow(
      /--project unidad/,
    )
    expect.soft(() =>
      VerificarScriptTestSoloUnidad({ scripts: { test: 'vitest run --project unidad --project integracion' } }),
    ).toThrow(/integracion/)
    expect.soft(() => VerificarScriptTestSoloUnidad({ scripts: {} })).toThrow(/scripts.test/)
  })

  it('test_ci_cancela_ejecuciones_anteriores: concurrency con cancel-in-progress: true', () => {
    expect(() => VerificarCancelacionDeEjecuciones(LeerCi())).not.toThrow()
    expect.soft(() =>
      VerificarCancelacionDeEjecuciones(Reemplazar('  cancel-in-progress: true', '  cancel-in-progress: false')),
    ).toThrow(/cancel-in-progress/)
    expect.soft(() =>
      VerificarCancelacionDeEjecuciones(Reemplazar('  cancel-in-progress: true\n', '')),
    ).toThrow(/cancel-in-progress/)
    expect.soft(() =>
      VerificarCancelacionDeEjecuciones(
        Reemplazar('concurrency:\n  group: ${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true\n', ''),
      ),
    ).toThrow(/concurrency/)
    expect.soft(() =>
      VerificarCancelacionDeEjecuciones(
        Reemplazar('  group: ${{ github.workflow }}-${{ github.ref }}', '  group: fijo'),
      ),
    ).toThrow(/group/)
  })

  it('test_ci_corre_en_runner_de_github: runs-on ubuntu-latest y sin self-hosted', () => {
    expect(() => VerificarRunnerDeGithub(LeerCi())).not.toThrow()
    expect.soft(() =>
      VerificarRunnerDeGithub(Reemplazar('runs-on: ubuntu-latest', 'runs-on: self-hosted')),
    ).toThrow(/self-hosted/)
    expect.soft(() =>
      VerificarRunnerDeGithub(Reemplazar('runs-on: ubuntu-latest', 'runs-on: [self-hosted, linux]')),
    ).toThrow(/self-hosted/)
    expect.soft(() =>
      VerificarRunnerDeGithub(Reemplazar('runs-on: ubuntu-latest', 'runs-on: windows-latest')),
    ).toThrow(/ubuntu-latest/)
    expect.soft(() => VerificarRunnerDeGithub(Reemplazar('    runs-on: ubuntu-latest\n', ''))).toThrow(
      /runs-on/,
    )
  })

  it('test_ci_acciones_fijadas_por_sha: un uses sin SHA de 40 caracteres es inválido', () => {
    expect(() => VerificarAccionesPorSha(LeerCi())).not.toThrow()
    expect(() =>
      VerificarAccionesPorSha(Reemplazar(`actions/checkout@${'a'.repeat(40)} # v1.0.0`, 'actions/checkout@v4')),
    ).toThrow(/SHA/)
    expect(() =>
      VerificarAccionesPorSha(Reemplazar(`@${'b'.repeat(40)}`, `@${'b'.repeat(39)}`)),
    ).toThrow(/SHA/)
  })

  it('test_ci_permisos_de_solo_lectura: contents: read y persist-credentials: false; write rechazado', () => {
    expect(() => VerificarPermisosDeSoloLectura(LeerCi())).not.toThrow()
    expect(() =>
      VerificarPermisosDeSoloLectura(Reemplazar('  contents: read', '  contents: write')),
    ).toThrow()
    expect(() =>
      VerificarPermisosDeSoloLectura(
        Reemplazar('  contents: read', '  contents: read\n  pull-requests: write'),
      ),
    ).toThrow(/escritura/)
    expect(() =>
      VerificarPermisosDeSoloLectura(Reemplazar('persist-credentials: false', 'persist-credentials: true')),
    ).toThrow(/persist-credentials/)
  })

  it('test_ci_sin_contexto_del_autor_en_run: github.event, github.head_ref o cualquier ${{ }} en un run es rechazado', () => {
    expect(() => VerificarSinContextoDelAutorEnRun(LeerCi())).not.toThrow()
    expect(() =>
      VerificarSinContextoDelAutorEnRun(
        Reemplazar('run: npm test', 'run: echo "${{ github.event.pull_request.title }}"'),
      ),
    ).toThrow(/github.event/)
    expect(() =>
      VerificarSinContextoDelAutorEnRun(
        Reemplazar('run: npm test', 'run: |\n          echo "${{ github.event.pull_request.head.ref }}"\n          npm test'),
      ),
    ).toThrow(/github.event/)
    expect.soft(() =>
      VerificarSinContextoDelAutorEnRun(Reemplazar('run: npm test', 'run: git checkout "${{ github.head_ref }}"')),
    ).toThrow(/github.head_ref/)
    expect.soft(() =>
      VerificarSinContextoDelAutorEnRun(Reemplazar('run: npm test', 'run: echo ${{ inputs.rama }}')),
    ).toThrow(/\$\{\{/)
    expect.soft(() =>
      VerificarSinContextoDelAutorEnRun(
        Reemplazar('run: npm test', 'run: >\n          echo ${{github.head_ref}}'),
      ),
    ).toThrow(/github.head_ref/)
  })

  it('test_ci_node_22_y_timeout: node-version 22 y timeout-minutes presentes; otra versión es inválida', () => {
    expect(() => VerificarNode22YTimeout(LeerCi())).not.toThrow()
    expect(() => VerificarNode22YTimeout(Reemplazar('node-version: 22', 'node-version: 20'))).toThrow(/20/)
    expect(() => VerificarNode22YTimeout(Reemplazar('node-version: 22', "node-version: '22.12'"))).toThrow(
      /22\.12/,
    )
    expect(() => VerificarNode22YTimeout(Reemplazar('    timeout-minutes: 15\n', ''))).toThrow(/timeout-minutes/)
  })

  it('test_ci_archivo_faltante_es_error: leer una ruta inexistente lanza error de lectura', () => {
    const rutaInexistente = new URL(rutaRelativaInexistente, import.meta.url)
    expect(() => readFileSync(rutaInexistente, 'utf8')).toThrow(/ENOENT/)
    expect(() => LeerCi()).not.toThrow()
  })
})
