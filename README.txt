Dreamlight Save Suite v3.8.1

Grid Map viewport hotfix

Root cause:
- v3.8 contained the new Google-Maps-style code in public/grid-visual-source.html,
  but public/index.html was still loading an older embedded Grid Map payload.
- The embedded payload identified itself as an older v2.5 GridCollection Map.
- Therefore the visible Grid Map did not use the v3.8 viewport code.

Fixed:
- Re-embedded the readable v3.8.1 grid-visual-source.html into the Suite.
- The visible iframe and readable source are now byte-for-byte the same HTML.
- Grid page/iframe sizing was tightened so the map fills the available page area.
- The map viewport itself has no scrollbars.
- Drag empty map space to pan.
- Mouse wheel zooms toward the pointer.
- Dragging an item still moves the item.
- Fit centers and scales the whole grid.
- Existing GridData/reference-layer functionality is preserved.

Dreamlight Save Suite v3.8

GridCollection map viewport update:
- Grid now lives inside a fixed, responsive map window that fills the available page area.
- No horizontal or vertical scroll bars on the map window.
- Drag empty map space to pan the whole grid, Google Maps style.
- Existing object dragging remains: drag an object itself to move that object.
- Mouse wheel zooms toward the pointer location.
- Fit button zooms and centers the entire grid in the available map window.
- Map automatically redraws when the page/window changes size.
- High-DPI canvas sizing keeps the map sharper on scaled displays.
- Existing reference-layer loading, editing, filtering, and GridData behavior are preserved.
