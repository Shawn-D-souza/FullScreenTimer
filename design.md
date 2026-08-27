# Design Direction: Full Screen Timer

## 1. The Core Philosophy: "The Screen Belongs to the User"
Monochrome is not merely a utility; it is a digital sanctuary for deep focus. The primary design directive of this application is *absence*. The interface must get out of the way entirely, leaving only the essential data (the time) on the screen. We are building an environment, not a dashboard. Every visual element must justify its existence, and by default, its existence should be hidden.

## 2. The Aesthetic "Vibe": Monolithic, Stark, and Zen
The app should feel like a high-end digital art piece or a timeless piece of Braun industrial design. It is unapologetically minimal. 
* **No cruft:** No drop shadows, no gradients, no borders, and no decorative UI panels.
* **Absolute Contrast:** We operate strictly in pure black (`#000000`) and pure white (`#FFFFFF`). There are no greys. 
* **The Void:** The beauty and elegance of the app come from perfect alignment, stark contrast, and the vast, quiet breathing room (negative space) surrounding the central elements.

## 3. Visual Language: Typography as UI
Because we are restricted to a binary color palette, typography carries the entire weight of the application's design.
* **The Hero Display:** The timer/clock digits are the focal point. They should be massive, dominating the screen and scaling elegantly with the viewport. A highly legible, geometrically precise sans-serif or an elegant monospace font is required. *Crucially, all numbers must use tabular figures so the layout never shifts or jitters as seconds tick by.*
* **The Ghost UI:** System text (mode tabs, settings icon, tips) should be significantly smaller, employing a clean, utilitarian sans-serif. It should feel like a subtle, whisper-quiet caption to the main event.
* **State Indication:** Because we cannot use color to denote status (like a red active button), we must rely on typography and shape. An active tab might be bolded or inverted (a white pill with black text). Pomodoro rounds are simple geometric glyphs (● ● ○ ○).

## 4. Layout Philosophy: Center Stage and The Perimeter
* **Center Stage:** The active time format lives dead center, anchored and monolithic. 
* **The Perimeter:** All navigation, tips, and settings live strictly at the extreme edges of the screen (top/bottom margins, far corners). The distance between the central timer and the edge UI should feel expansive, creating a clear visual hierarchy between "The Work" and "The Controls."
* **Settings Overlay:** When the settings menu is triggered, it should maintain the monochrome aesthetic but shift to a structured, highly readable, editorial layout—reminiscent of a high-end magazine index or an architectural blueprint. 

## 5. Interaction & Animation: Evanescence
The app is alive but perfectly quiet. Interactions should feel organic, like breathing.
* **The Fade (Ghost UI):** The materialization and evaporation of the Ghost UI is our signature interaction. Relying on Svelte's native transition engine, the UI must fade in and out with a smooth, luxurious ease. It should never snap instantly; it should gently emerge from the background when summoned and dissolve into the void when ignored.
* **Tactile Keyboard Feel:** The app should feel like a terminal power-tool wrapped in a designer's aesthetic. Keyboard interactions (Space, R, Tab) must provide instant, zero-latency feedback.
* **Hover States:** Interactive elements in the Ghost UI should rely on elegant structural shifts on hover—an underline appearing, or an icon slightly scaling up.

## 6. Emotional Tone: Focused, Uncluttered, Professional
When a user launches Monochrome, their heart rate should slow down. The stark lack of color and the immediate disappearance of the surrounding UI signals to the brain that it is time to focus. It should never feel stressful, loud, or gamified. Even when an alarm goes off, the visual language remains calm. Monochrome is a silent, reliable partner in the user's flow state.
