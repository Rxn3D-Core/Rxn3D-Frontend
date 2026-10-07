# Logo upload: ask for high-resolution rectangle logo

Logo upload helper copy on lab/office profile and registration flows asks for a **high-resolution** logo in a **rectangle (landscape)** format. No fixed pixel size (e.g. 300×150) is shown to users.

## Shared copy

`TOP_BAR_LOGO_UPLOAD_HINT` in `components/case-design-center/components/TopBar.tsx`:

> Please upload a high-resolution logo in a rectangle (landscape) format for a sharp header display.

`TOP_BAR_RECOMMENDED_LOGO_SIZES` remains for internal TopBar display sizing only.

## Surfaces updated

- Lab profile overview
- Office profile overview
- Edit customer profile modal
- Lab registration profile form
- Office/practice registration profile form
