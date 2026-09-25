/** Letter layout shared with portrait v4. Browser print only — no DomPDF rules. */
export const PAPER_SLIP_V5_CSS = `
@page { size: letter portrait; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 628px;
  margin: 0 auto;
  background: #fff;
  color: #000;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
body {
  font-family: Inter, Arial, Helvetica, sans-serif;
  display: flex;
  justify-content: center;
}
.ps-page {
  width: 628px;
  height: 890px;
  max-height: 890px;
  overflow: hidden;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
  padding: 4px 8px;
  gap: 4px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.ps-main {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  flex: 0 0 auto;
  min-height: 0;
}
.ps-header {
  width: 100%;
  height: 44px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0 0;
  background: #FFFFFF;
  flex-shrink: 0;
}
.ps-brand-wrap {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: auto;
  max-width: calc(100% - 150px);
  height: 40px;
  flex: 1;
  min-width: 0;
  gap: 8px;
}
.ps-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}
.ps-brand {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  max-width: 380px;
  height: 40px;
  min-width: 0;
}
.ps-lab-name {
  font-family: Verdana, Geneva, sans-serif;
  font-weight: 700;
  font-size: 21px;
  line-height: 24px;
  letter-spacing: -0.02em;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.ps-lab-addr {
  width: 100%;
  height: 18px;
  font-family: Verdana, Geneva, sans-serif;
  font-size: 15px;
  line-height: 18px;
  letter-spacing: -0.02em;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ps-delivery {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 5px;
  width: 156px;
  height: 48px;
  background: #fff;
  border: 1px solid #000;
  border-radius: 6px;
  flex-shrink: 0;
}
.ps-delivery-label {
  font-family: Inter, Arial, sans-serif;
  font-weight: 700;
  font-size: 12px;
  line-height: 14px;
}
.ps-delivery-value {
  font-family: Inter, Arial, sans-serif;
  font-weight: 700;
  font-size: 14px;
  line-height: 17px;
}
.ps-ids {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 12px;
  gap: 8px;
  width: 100%;
  border: 1px solid #B8BFC4;
  border-radius: 5px;
  flex-shrink: 0;
}
.ps-ids-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}
.ps-id {
  flex: 1;
  min-width: 0;
  font-family: Inter, Arial, sans-serif;
  font-weight: 600;
  font-size: 11px;
  line-height: 13px;
  color: #3D3D3D;
}
.ps-id span {
  display: block;
  margin-top: 2px;
  font-weight: 600;
  font-size: 14px;
  line-height: 16px;
  color: #000;
}
.ps-legend {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: auto;
  flex-shrink: 0;
}
.ps-legend-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  font-family: Inter, Arial, sans-serif;
  font-weight: 500;
  font-size: 11px;
  line-height: 14px;
  letter-spacing: 0.01em;
  color: #666;
}
.ps-swatch {
  width: 8px;
  height: 12px;
  border: 0.5px solid #D6D7D3;
  border-radius: 1px;
  box-shadow: 0.3px 1px 1.2px rgba(35, 31, 32, 0.15);
}
.ps-swatch-tim { background: #DCD7C1; }
.ps-swatch-missing { background: #EBEBE9; }
.ps-swatch-wed {
  background: linear-gradient(0deg, #DED2C7, #F3E7D7);
  position: relative;
}
.ps-swatch-wed::after {
  content: '×';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #CF0202;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}
.ps-charts {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0;
  gap: 16px;
  width: 100%;
  flex-shrink: 0;
}
.ps-arch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}
.ps-arch .chart-label {
  font-family: Inter, Arial, sans-serif;
  font-weight: 700;
  font-size: 14px;
  line-height: 16px;
  letter-spacing: -0.02em;
  color: #4C4D55;
  text-align: center;
  padding: 0;
}
.ps-arch .teeth-row {
  width: 100%;
  height: 54px;
  min-width: 0;
  display: flex;
  justify-content: center;
  overflow: hidden;
}
.ps-arch .teeth-row svg {
  width: auto;
  max-width: 100%;
  height: 54px;
  display: block;
}
.ps-product-box {
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  border: 0.5px solid #D3D3D3;
  border-radius: 3.5px;
  background: #fff;
  padding: 10px 12px;
  text-align: center;
  margin-top: 2px;
}
.ps-product-title {
  font-family: Inter, Arial, sans-serif;
  font-weight: 700;
  font-size: 16px;
  line-height: 20px;
  color: #4C4D55;
}
.ps-product-teeth {
  font-family: Inter, Arial, sans-serif;
  font-size: 14px;
  line-height: 17px;
  letter-spacing: -0.03em;
  color: #666;
  white-space: nowrap;
}
.ps-details {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content minmax(0, 1fr);
  column-gap: 8px;
  align-items: center;
  flex-shrink: 0;
  font-family: Verdana, Geneva, sans-serif;
  font-size: 15px;
  line-height: 22px;
  letter-spacing: -0.02em;
  color: #1A1A1A;
}
.ps-details .lbl {
  grid-column: 2;
  text-align: center;
  font-weight: 700;
  white-space: nowrap;
  padding: 0 4px;
  line-height: 22px;
}
.ps-details .val-l,
.ps-details .val-r {
  min-width: 0;
  overflow: hidden;
  font-weight: 400;
  line-height: 22px;
}
.ps-details .val-l { grid-column: 1; text-align: right; }
.ps-details .val-r { grid-column: 3; text-align: left; }
.ps-clip {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* rtl puts the ellipsis on the outer edge and keeps the end of the text by the label. */
.ps-clip-l {
  direction: rtl;
  text-align: right;
}
.ps-clip-text {
  direction: ltr;
  unicode-bidi: isolate;
}
.ps-clip-r { text-align: left; }
.ps-shade-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
.ps-shade-line-l { justify-content: flex-end; }
.ps-shade-line-r { justify-content: flex-start; }
.ps-shade-pair {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
}
.ps-shade {
  flex: 0 0 auto;
  white-space: nowrap;
}
.ps-sys {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ps-shade-sep { flex: 0 0 auto; }
.ps-qr-note {
  width: 100%;
  padding: 2px 0;
  font-family: Inter, Arial, sans-serif;
  font-style: italic;
  font-size: 13px;
  line-height: 16px;
  text-align: center;
  color: #4C4D55;
  flex-shrink: 0;
}
.ps-notes {
  box-sizing: border-box;
  width: 100%;
  min-height: 52px;
  max-height: 72px;
  overflow: hidden;
  border: 1px solid #B8BFC4;
  border-radius: 7px;
  padding: 8px 12px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 15px;
  line-height: 18px;
  color: #4C4D55;
  flex-shrink: 0;
}
.ps-sig-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 28px 0 0;
  flex-shrink: 0;
}
.ps-sig { width: 206px; text-align: center; }
.ps-sig-line { border-top: 1px solid #B3B3B3; margin-bottom: 4px; }
.ps-sig-label {
  font-family: Inter, Arial, sans-serif;
  font-size: 10px;
  line-height: 12px;
  color: #0A0B0E;
}
.ps-detach {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0 0 10px;
  gap: 8px;
  flex-shrink: 0;
}
.ps-cut { width: 100%; border-top: 1px dashed #80878C; }
.ps-stub {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 4px;
  width: 100%;
  padding: 8px 0 0;
}
.ps-stub-top,
.ps-stub-bottom {
  display: contents;
}
.ps-qr {
  width: 132px;
  height: 121px;
  flex-shrink: 0;
  object-fit: contain;
  display: block;
  background: #fff;
}
.ps-qr-missing {
  width: 132px;
  height: 121px;
  flex-shrink: 0;
  background: #eee;
  border: 1px solid #ddd;
}
.ps-pan {
  min-width: 0;
  font-family: Inter, Arial, sans-serif;
  font-size: 121px;
  line-height: 121px;
  height: 121px;
  color: #0A0B0E;
  overflow: hidden;
  white-space: nowrap;
}
.ps-stub-office,
.ps-stub-arches {
  min-width: 0;
  font-family: Inter, Arial, sans-serif;
  font-size: 15px;
  line-height: 19px;
  color: #0A0F12;
}
.ps-k { font-weight: 700; }
.ps-v { font-weight: 400; }
@media print {
  /* Letter stays portrait. The slip is turned 90° into the top half (5.5in);
     the bottom half stays blank so the sheet can be cut. Turn the half left to read it. */
  @page { size: letter portrait; margin: 0; }
  html, body {
    width: 8.5in !important;
    height: 11in !important;
    max-height: 11in !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    overflow: clip !important;
  }
  body {
    display: block !important;
    position: relative !important;
  }
  .ps-sheet {
    position: relative !important;
    width: 8.5in !important;
    height: 11in !important;
    max-height: 11in !important;
    overflow: clip !important;
  }
  .ps-page {
    position: absolute !important;
    top: 0 !important;
    /* Origin sits on the right of the centered, rotated artboard.
       Short side (628px) maps to the 5.5in half; long side stays inside 8.5in. */
    left: calc((8.5in + 5.5in * 890 / 628) / 2) !important;
    width: 628px !important;
    max-width: 628px !important;
    height: 890px !important;
    max-height: 890px !important;
    margin: 0 !important;
    padding: 4px 8px !important;
    overflow: hidden !important;
    zoom: 1 !important;
    transform-origin: top left !important;
    transform: rotate(90deg) scale(calc(5.5in / 628px)) !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    page-break-after: avoid !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .ps-charts {
    display: flex !important;
    flex-wrap: nowrap !important;
    flex-direction: row !important;
  }
  .ps-arch { flex: 1 1 0 !important; min-width: 0 !important; }
  .ps-qr, .ps-logo, .ps-arch .teeth-row svg image {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`;
