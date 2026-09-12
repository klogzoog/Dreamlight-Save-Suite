# Dreamlight Save Suite

Dreamlight Save Suite is an **unofficial, fan-made toolkit for Disney Dreamlight Valley** that can decode, inspect, edit, and visualize supported game save data.

It includes support for encrypted `profile.json` files, multiple decoded data formats, known-ID lookups, GridCollection editing, and an interactive Grid Map with reference-layer loading, panning, zooming, and GridData visualization.

## How to Use

1. Install [Node.js](https://nodejs.org/).
2. Download or clone this repository.
3. Open a terminal in the project folder.
4. Run `npm install`.
5. Run `npm start`.
6. Open the local address shown in the terminal.
7. Load your `profile.json` or another supported file.
8. For the Grid Map, select the requested game-data root folder when prompted. The Suite uses each Grid object's `GridDataPath` to locate and decode its reference layer on demand.

## Important

Always make a backup of your original save before editing it. Incorrect modifications may corrupt your save or cause unexpected game behavior.

This project is a work in progress, and some game-data formats may not yet be fully supported.

## Disclaimer

Dreamlight Save Suite is an unofficial fan-made project and is not affiliated with, endorsed by, or associated with Disney or Gameloft. Disney Dreamlight Valley and related names and assets belong to their respective owners.
