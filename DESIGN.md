---
name: Narra
description: A restrained editorial workspace for building narrative worlds.
colors:
  canvas: "#09090b"
  surface: "#18181b"
  border: "#27272a"
  ink: "#fafafa"
  muted-ink: "#a1a1aa"
  amber: "#f59e0b"
  amber-bright: "#fbbf24"
  amber-wash: "rgba(245, 158, 11, 0.1)"
  danger: "#ef4444"
  danger-soft: "#fca5a5"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 9vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.05em"
  prose:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  square: "0px"
spacing:
  compact: "0.5rem"
  control: "1rem"
  content: "1.5rem"
  section: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.amber}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0.5rem 1rem"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0.5rem 0.75rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "{spacing.content}"
---

# Design System: Narra

## Overview

**Creative North Star: "The Amber Margin"**

Narra is a quiet editorial workspace: near-black working surfaces, crisp pale type, and a single amber mark that behaves like an editor's pencil in the margin. The visual system keeps narrative content in front by relying on typography, alignment, and fine rules instead of ornamental containers.

The atmosphere is focused, literary, and precise. Inter carries the interface and Narra wordmark, Source Serif 4 is reserved for manuscript-like prose, and IBM Plex Mono makes counts and structured data visibly distinct. Density is compact in work areas; entry surfaces may use larger breathing room without changing the material language.

**Key Characteristics:**

- Near-black canvas with restrained tonal separation.
- Amber used sparingly for identity, selection, and action.
- Square controls and one-pixel borders.
- Left-aligned editorial composition with decisive whitespace.
- Motion is brief, directional, and fully removable.

## Colors

The palette is almost monochrome, with warm amber providing the sole branded interruption and semantic colors appearing only when status demands them.

### Primary

- **Editorial Amber:** The identity and action color for primary outlines, selected markers, active navigation, the accented letter in the wordmark, and keyboard focus.
- **Bright Amber:** A limited highlight step for moments that require slightly more luminosity than the core accent.
- **Amber Wash:** A low-density selection background that lets amber mark state without filling large areas.

### Neutral

- **Ink Black:** The dominant application canvas and the inverse text color on filled amber states.
- **Charcoal Surface:** The secondary surface for cards and controls that need separation from the canvas.
- **Graphite Rule:** Fine borders, dividers, and low-emphasis hover fills.
- **Paper White:** Primary text and high-contrast marks on dark surfaces.
- **Quiet Zinc:** Secondary text, supporting labels, and de-emphasized metadata.

### Named Rules

**The One Amber Rule.** Amber is the only brand accent on a surface; its rarity gives actions and active states authority.

**The Canvas Rule.** Default to the near-black canvas. Use charcoal to separate functional regions, not to build decorative layers.

## Typography

**Display Font:** Inter (with system-ui and sans-serif fallback)  
**Body Font:** Inter (with system-ui and sans-serif fallback)  
**Prose Font:** Source Serif 4 (with Georgia and serif fallback)  
**Data Font:** IBM Plex Mono (with monospace fallback)

**Character:** The interface is modern and neutral enough to disappear during work, while the serif and mono roles distinguish narrative prose from structured project data. The oversized Narra wordmark uses tight tracking and a compact line box to create an editorial masthead rather than a conventional app logo.

### Hierarchy

- **Display:** Bold, tightly tracked, and fluid; reserved for the Narra wordmark and rare identity moments.
- **Title:** Semibold and compact; names pages, projects, and primary content regions.
- **Body:** Regular-weight interface copy with comfortable reading rhythm.
- **Label:** Small, medium-weight text; uppercase with wider tracking when it identifies a field or compact control.
- **Prose:** Source Serif 4 for manuscript-facing narrative content, never general interface chrome.
- **Data:** IBM Plex Mono for counts, measurements, dates, and similarly structured values.

### Named Rules

**The Role Separation Rule.** Inter operates the product, Source Serif 4 carries narrative prose, and IBM Plex Mono carries data; do not swap roles for decoration.

## Layout

Narra uses a left-aligned spatial model with fine dividers between working regions. Desktop workspaces may use fixed side rails and flexible content panes; focused entry surfaces center their content vertically while preserving a strong left edge.

Spacing follows a compact 0.5rem rhythm for local relationships, 1rem for controls, 1.5rem for content padding, and 3rem for major separation. The login expression uses a fluid horizontal inset and a narrow reading/action column; at 640px and below, the inset resolves to explicit mobile padding and the column remains bounded by the viewport.

**The One-Task Entry Rule.** Authentication surfaces expose the identity, one Kyros action, and actionable error feedback—nothing competes with the path into the workspace.

## Elevation & Depth

The system is flat by default and uses no shadows. Depth comes from tonal separation, one-pixel borders, and layout planes. Hover may shift a control by a restrained two pixels when that movement reinforces action, but it must not introduce floating card chrome.

### Named Rules

**The Flat-by-Default Rule.** Use surface tone and borders for hierarchy; shadows are not part of the incumbent visual vocabulary.

## Shapes

Primary interface geometry is rectilinear: buttons, inputs, cards, badges, and major containers have square corners. Circular geometry is reserved for inherently round content such as avatars and timeline nodes. Borders remain thin and structural.

**The Square Frame Rule.** Functional containers and controls use zero radius unless the content itself is intrinsically circular.

## Components

### Buttons

- **Shape:** Square with a one-pixel outline.
- **Primary:** Charcoal or transparent ground with amber border and text; hover fills amber and reverses text to Ink Black.
- **Hover / Focus:** Brief color transition; signature calls to action may lift two pixels. Keyboard focus is a solid three-pixel amber outline with a four-pixel offset.
- **Ghost:** Transparent with no visible resting border; a quiet Graphite Rule wash appears on hover.
- **Disabled:** Reduced opacity with a disabled cursor; state remains legible without animation.

### Cards / Containers

- **Corner Style:** Square.
- **Background:** Charcoal Surface over Ink Black when separation is needed.
- **Shadow Strategy:** None; see Elevation & Depth.
- **Border:** One-pixel Graphite Rule.
- **Internal Padding:** Content spacing by default, adjusted only for density.

### Inputs / Fields

- **Style:** Ink Black background, one-pixel Graphite Rule, Paper White input text, and softened Quiet Zinc placeholder text.
- **Focus:** Remove the browser default outline and shift the field border to Editorial Amber.
- **Labels:** Small, medium-weight, uppercase Inter with wider tracking.

### Badges

- **Style:** Compact inline label with a square one-pixel border and no ornamental fill by default.
- **State:** Amber may identify an active or meaningful state; Quiet Zinc carries metadata.

### Authentication Entry

The signature login expression pairs the oversized Narra wordmark with one full-width outlined amber Kyros action and a hairline amber vertical margin rule. The action includes a right-pointing arrow that advances slightly on hover. Authentication errors sit directly below the action in soft danger red and use `role="alert"`.

Entry motion draws the margin rule and settles the content once. Under reduced-motion preferences, both entrance animations and all button/arrow transitions are removed.

## Do's and Don'ts

### Do:

- **Do** use amber to identify the primary action, current state, or a precise brand mark.
- **Do** preserve strong left edges, deliberate whitespace, and compact working density.
- **Do** keep all critical interaction states visible without relying on motion.
- **Do** use a solid amber keyboard focus indicator on custom interactive controls.
- **Do** write interface copy in Narra's sober, direct French voice.

### Don't:

- **Don't** introduce competing brand hues, gradients, or decorative color fields.
- **Don't** add rounded cards, pill-shaped controls, or soft shadow stacks to ordinary UI.
- **Don't** mix prose, data, and interface type roles for visual novelty.
- **Don't** add secondary actions to a single-task authentication surface.
- **Don't** animate when `prefers-reduced-motion` requests reduction.
