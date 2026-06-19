# Header RXN3D Logo Design

## Goal

Display the existing RXN3D brand image in the top-left area of the shared authenticated header.

## Design

- Render `/images/rxn3d-latest.png` in `components/header.tsx` with Next.js `Image`.
- Place the logo as the first item in the left header group, followed by the waffle launcher and existing action buttons.
- Preserve the source image's 195:76 aspect ratio with an automatic width and a responsive height that fits the current header row.
- Use `RXN3D` as accessible alternative text.
- Do not change existing header actions, permissions, navigation behavior, or the user's unrelated working-tree changes.

## Verification

- Add a focused test that verifies the shared header declares and renders the requested logo before the waffle launcher.
- Run the focused test and frontend lint or TypeScript validation available in the repository.
- Inspect the rendered header at desktop and narrow viewport widths if the local app can be started with the existing environment.
