declare module "qrcode" {
  interface QRCodeStatic {
    toDataURL(
      text: string,
      options?: {
        margin?: number;
        width?: number;
        errorCorrectionLevel?: "L" | "M" | "Q" | "H";
      }
    ): Promise<string>;
    toDataURL(
      text: string,
      options: {
        margin?: number;
        width?: number;
        errorCorrectionLevel?: "L" | "M" | "Q" | "H";
      },
      callback: (error: Error | null | undefined, url: string) => void
    ): void;
  }

  const QRCode: QRCodeStatic;
  export default QRCode;
}
