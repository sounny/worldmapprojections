# World Map Projections - Development Plan

## Objective

Enhance the "Modern Discovery" application by expanding projection offerings, implementing dynamic high-resolution geometries, and refining the aesthetic and user experience.

## Phase 1: Expanding Projections (More D3 Options)

- **Goal:** Offer a comprehensive list of projections that covers all major categories (Conic, Polyhedral, etc.).
- **Tasks:**
  - Update `modern.html` `<select>` dropdown to include newly supported D3 projections (e.g., Albers, Equidistant Conic, Peirce Quincuncial, Wagner, Boggs).
  - Modify `js/app.js` to handle projection-specific parameters if needed (e.g., scaling variations, standard parallels for conics).
- **Self-Correction/Improvement Check:** _How can this be better?_ Instead of just adding options, group them logically. Some projections (like Albers) need specific configurations (e.g., `.parallels()`). I need to ensure the `js/app.js` can gracefully configure these specific projections rather than just calling the default `d3[projType]()`.

## Phase 2: Dynamic Geometry Loading (110m vs 50m GADM)

- **Goal:** Give the user the ability to toggle between performance-friendly (110m) and high-detail (50m) administrative geometries.
- **Tasks:**
  - Complete the download of the `countries-50m.json` TopoJSON file.
  - Add a "Resolution" toggle or button to the sidebar in `modern.html`.
  - Refactor data loading in `js/app.js` to fetch and switch datasets asynchronously without breaking the projection view or crashing.
- **Self-Correction/Improvement Check:** _How can this be better?_ Loading a large 50m TopoJSON might freeze the UI briefly. I should cache the fetched JSON data so toggling back and forth is instantaneous. I'll add a loading indicator or disable the toggle during the fetch.

## Phase 3: UI/Styling Refinements

- **Goal:** Elevate the "Cyber / Deep Sea" aesthetic to feel even more premium.
- **Tasks:**
  - Improve the interaction of range sliders in `modern.html` (e.g., custom slider thumb styling).
  - Add subtle CSS transitions to the canvas container.
  - Refine typography hierarchy for the control labels.
- **Self-Correction/Improvement Check:** _How can this be better?_ The map itself can look richer. I'll adjust the graticule lines and add a slight drop shadow or glow. I'll style the scrollbars and form elements to fit the dark mode perfectly.
