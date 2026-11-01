---
name: probosque-ui-ux-pro
description: Complete UI/UX architecture, Cardless Claymorphism layout system, React/Tailwind component patterns, and Antigravity refactoring workflow for the PROBOSQUE forestry program web application. Use whenever building, redesigning, or refactoring views, dashboards, search consoles, or document explorers for PROBOSQUE so the interface is intuitive, warm, tactile, free of generic cards, and free of code/monospace labels.
---
# Probosque UI UX Pro

Architect and refactor the **PROBOSQUE (Protectora de Bosques del Estado de México)** web application using **Cardless Botanical Claymorphism**. This skill transforms cold, cluttered AI-generated interfaces (such as navy-blue banners, monospace pill tags, and repetitive card grids) into an intuitive, breathable, user-friendly workspace where tactile 3D clay controls live harmoniously on an open editorial canvas.

## When to Use

- Refactoring an existing Antigravity-generated interface for PROBOSQUE that looks too generic, saturated, or robotic
- Building new screens, citizen consultation portals, forestry project trackers, or AI document assistants for PROBOSQUE
- Implementing Claymorphism in CSS, Tailwind CSS, or React without falling into the trap of boxing every element into floating cards

## 1. Core Architectural Rule: "Tactile Controls, Open Information"

The biggest mistake in web design is putting every piece of text inside a box or card. To achieve an intuitive, unsaturated Claymorphic interface:

1. **Apply Claymorphism ONLY to Interactive & Tactile Elements:**
   - Primary action buttons (`#E0643A` Terracota Resina with dual inner shadows)
   - Floating navigation docks (`#355044` Dosel Esmeralda or `#D9D1B8` Tierra Caliza)
   - Recessed search/input wells (`#EAE4D3` sculpted *into* the canvas via `inset` shadows)
   - Interactive region selectors and filter toggles
2. **Keep Data, Text, and Metrics on the Open Canvas (Zero Cards):**
   - Headlines, forestry statistics, project descriptions, and document lists rest directly on the warm alabaster-sand canvas (`#F4F1EA`).
   - Separate sections using generous vertical whitespace (`48px` to `72px`) and soft organic hairlines (`1px solid rgba(107, 139, 120, 0.18)`), never rectangular card containers.

## 2. The 4-Zone Cardless Workspace Layout

Replace the cluttered multi-banner and multi-card layout with four intuitive zones:

### Zone 1: Floating Clay Navigation Dock (Top Bar)

- **Structure:** A single floating pill bar (`max-w-6xl mx-auto mt-6 px-6 py-3 rounded-full`) sculpted in **Tierra Caliza (`#D9D1B8`)** or **Dosel Esmeralda (`#355044`)** with soft clay elevation.
- **Left:** Warm botanical emblem + **PROBOSQUE** in `Outfit` (`font-medium text-lg`), followed by natural context text (`Estado de México`) without bordered country/status pills.
- **Center/Right:** 3 to 4 clean navigation links (`Inicio`, `Acervo Forestal`, `Programas`, `Cartografía`) and a single tactile CTA button in **Terracota Resina (`#E0643A`)** (`Nueva consulta`).

### Zone 2: Open-Air Editorial Hero & Metric Strip (Inspired by `image_46dfdd.jpg`)

- **Left Column (Span 7):** Warm human welcome title in `Outfit` (`font-light text-4xl text-[#1B2A24]`): *"Explora el acervo técnico y los programas de conservación forestal"* with a concise, jargon-free subtitle in `#6B8B78`.
- **Right Column (Span 5 — Open Metric Strip, NO Cards):** Up to 3 big expressive indicators aligned horizontally on the open canvas:
  - Example: `10` (*Expedientes verificados*), `+24%` (*Meta de reforestación*), `100%` (*Cobertura estatal*).
  - Use `Outfit` at `40px` (`font-light`) in `#355044` and `#E0643A` with plain text captions below. Do not wrap these numbers in boxes.

### Zone 3: Recessed Clay Consultation Well (Search & Assistant Input)

- **Why it works:** Instead of a cold white input with a sharp gray border, the search/chat bar is a **Recessed Clay Well** (`background: #EAE4D3`, `border-radius: 28px`, `box-shadow: inset 5px 5px 11px rgba(107,139,120,0.24), inset -5px -5px 11px rgba(255,255,255,0.85)`).
- **Scope Selector (Replacing the Prohibited `[ ● Alcance: Corpus Global ]` Pill):** Inside the bottom-left of the well, place a soft, clickable **Clay Pebble Selector** in `#D9D1B8` with `Plus Jakarta Sans` text: *"Explorando: Todo el acervo forestal (10 documentos)"* with a smooth chevron icon.
- **Submit Button:** Sculpted 3D Clay button in **Terracota Resina (`#E0643A`)** (`Consultar acervo`).

### Zone 4: Organic Editorial Stream (Replacing the Prohibited `01 · ESTADO DEL CORPUS` Banner & Cards)

- **Section Heading:** Clean, open typography (`Outfit`, `24px`, `#1B2A24`) with a soft terracotta or sprout accent bar (`w-8 h-1.5 rounded-full bg-[#E0643A]`) instead of a full-width navy blue bar.
- **Document & Program Rows:** Display projects and forestry documents as an airy vertical list (`divide-y divide-[#6B8B78]/15`). Each row features:
  - Soft sculpted clay icon token (`44px x 44px rounded-2xl bg-[#B9C8B2]`) on the left
  - Title in `Plus Jakarta Sans` (`font-semibold text-[#1B2A24]`) and natural summary in `#6B8B78`
  - Quiet right-aligned action link (`Abrir expediente →` in `#355044` or `#E0643A` on hover)

## 3. Step-by-Step Antigravity Refactoring Workflow

When asked to fix or build a PROBOSQUE screen, follow these exact steps:

1. **Purge All Prohibited Patterns (`image_4676e0.png` Cleanup):**
   - Delete every occurrence of `font-mono`, `uppercase tracking-widest`, `bg-blue-*`, `bg-slate-*`, `bg-indigo-*`, and static status dots (`●`).
   - Delete numbered dark banners (`01 · ESTADO DEL CORPUS...`) and static bordered tags (`GLOBAL ACTIVO`).
2. **Inject the PROBOSQUE Clay Stylesheet:**
   - Load `Outfit` and `Plus Jakarta Sans` from Google Fonts and define the 5 base colors (`#1B2A24`, `#355044`, `#6B8B78`, `#B9C8B2`, `#D9D1B8`), the breathable canvas (`#F4F1EA`), and the standout extra accent **`#E0643A` (Terracota Resina)**.
3. **Unbox the Layout (Remove Card Grids):**
   - Strip `.card`, `border`, and `shadow-md` wrappers from informational blocks. Let metrics and document lists sit directly on `#F4F1EA` with generous padding.
4. **Apply Clay Shadows to Interactive Controls:**
   - Apply `--clay-shadow-terracotta`, `--clay-shadow-sand`, and `--clay-well-recessed` from `references/probosque-components.md` to buttons, docks, and input wells.

## Reference Files

- `references/probosque-components.md`: Complete React + Tailwind CSS component library implementing Cardless Claymorphism for PROBOSQUE.
- `references/probosque-clay-workspace.html`: Full standalone interactive HTML/CSS template showing the refactored PROBOSQUE workspace in action.
- `references/antigravity-master-prompt.md`: Copy-paste prompt for Antigravity to execute a full UI overhaul without regressions.
