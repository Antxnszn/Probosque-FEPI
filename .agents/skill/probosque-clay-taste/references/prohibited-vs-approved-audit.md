# Auditoría Visual: Patrones Prohibidos vs. Estándar PROBOSQUE Clay

Esta guía documenta exactamente lo que **queda estrictamente prohibido** (basado en la captura `image_4676e0.png` generada previamente por Antigravity) y cómo reemplazarlo por un diseño orgánico, amable y sin tarjetas genéricas.

## 1. Desglose de la Imagen Prohibida (`image_4676e0.png`)

En la versión defectuosa generada por IA aparecían tres errores graves que destruyen la identidad de PROBOSQUE:

1. **Etiqueta tipo píldora con fuente de código (`[ ● Alcance: Corpus Global (1 Proyectos · 10 Docs) ]`):**
   - **Por qué está prohibido:** Usa fondo azul pálido hospitalario (`#E8F0FE`), borde rígido azulado, un punto verde de telemetría falsa y tipografía monoespaciada (`monospace`) propia de un IDE de programación.
2. **Franja azul marino corporativa con numeración robótica (`01 · ESTADO DEL CORPUS MULTIPROYECTO`):**
   - **Por qué está prohibido:** El azul marino (`#002B66`) es ajeno a la paleta forestal de PROBOSQUE; el texto en mayúsculas con espaciado ancho (`uppercase tracking-widest font-mono`) parece una consola militar o bancaria.
3. **Etiqueta encajonada `[ GLOBAL ACTIVO ]`:**
   - **Por qué está prohibido:** Encierra palabras estáticas en cajas con bordes que saturan la vista y no aportan ninguna función interactiva.

## 2. Tabla de Reemplazo Obligatorio

| Elemento Prohibido (Estilo `image_4676e0.png`) | Reemplazo Obligatorio (PROBOSQUE Clay Taste) |
| :--- | :--- |
| Fuente `font-mono` (`JetBrains Mono`, `Courier`, `Fira Code`) | Fuente humanista y orgánica: `Outfit` para cifras y titulares suaves (`font-light` / `font-normal`) y `Plus Jakarta Sans` para lectura amable. |
| Píldoras con borde (`border rounded-lg bg-blue-50 px-3 py-1`) | **Texto limpio al aire libre** o un **Selector Táctil de Arcilla (Clay Pill)** sin bordes duros, usando `--pb-earth-sand` (`#D9D1B8`) sólo si el usuario puede hacer clic para cambiar el alcance. |
| Punto verde o neón de estado (`● Alcance...` / `GLOBAL ACTIVO`) | Eliminar por completo los puntos de estado falsos y las etiquetas de "ACTIVO". Mostrar el contexto con lenguaje natural: *"Consultando 10 expedientes del programa estatal"*. |
| Franjas oscuras azules con `01 · TITULO EN MAYUSCULAS` | **Encabezados Editoriales Abiertos** en color Bosque Profundo (`#1B2A24`), tamaño `28px`-`36px`, peso `400`, sin números prefijados tipo código ni barras de fondo que partan la pantalla. |
| Cuadrículas saturadas de tarjetas (`div` con borde y sombra dura repetidos) | **Flujo Espacial Abierto (Cardless Flow):** Los datos viven directamente sobre el lienzo crema/arena (`#F4F1EA`), separados por espacio generoso. Solo los botones e inputs tienen volumen Clay 3D. |

## 3. Comparativa en Código (Antes vs. Después)

### ❌ PROHIBIDO (Lo que Antigravity NO debe volver a generar jamás)

```tsx
// PROHIBIDO: Estilo consola IA con fuente código, azul marino y etiquetas encajonadas
<div className="space-y-4">
  <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-1.5 font-mono text-xs text-blue-900">
    <span className="h-2 w-2 rounded-full bg-emerald-600" />
    Alcance: Corpus Global (1 Proyectos · 10 Docs)
  </div>

  <div className="flex items-center justify-between bg-[#002868] px-4 py-2.5 text-white font-mono text-xs tracking-widest uppercase">
    <span>01 · ESTADO DEL CORPUS MULTIPROYECTO</span>
    <span className="rounded border border-blue-400/40 bg-blue-950 px-2.5 py-1 text-[11px]">
      GLOBAL ACTIVO
    </span>
  </div>
</div>
```

### ✅ APROBADO (PROBOSQUE Claymorfismo Orgánico y Sin Saturación)

```tsx
// APROBADO: Diseño cálido, táctil, sin fuentes código ni cajas innecesarias
<section className="py-6">
  <div className="flex flex-wrap items-baseline justify-between gap-4">
    <div>
      <h2 className="font-['Outfit'] text-3xl font-normal tracking-tight text-[#1B2A24]">
        Panorama Forestal del Estado de México
      </h2>
      <p className="mt-1 font-['Plus_Jakarta_Sans'] text-base text-[#6B8B78]">
        Explorando 10 expedientes técnicos y programas de reforestación vigentes
      </p>
    </div>

    {/* Único control táctil Clay con el color extra Terracota Resina (#E0643A) */}
    <button
      type="button"
      className="clay-btn-terracotta px-5 py-2.5 text-sm text-white"
    >
      Cambiar región forestal
    </button>
  </div>
</section>
```
