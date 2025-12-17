// Types for QR scan functionality
export interface QRScanPayload {
  case_id: number;
  slip_ids: number[];
  session_key?: string; // Optional on 1st scan, If not passed, New session will be generated on the backend
}

export interface QRScanResponseData {
  case_id: number;
  case_number: string;
  slip_id: number;
  slip_number: string;
  patient_name: string;
  casepan_number: string;
  location_id: number;
  location: string;
  current_driver_location: string;
  customer_code: string;
  customer_id: number;
}

export interface QRScanResponse {
  success: boolean;
  message: string;
  data: QRScanResponseData[];
  session_key: string;
  current_office_code: string;
  scanned_cases_count: number;
}

class SlipService {
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  // Helper to get token from localStorage
  private getToken(): string | null {
    return typeof window !== "undefined" ? localStorage.getItem("token") : null;
  }

  // Helper to get auth headers
  private getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Scan QR code endpoint
  async scanQR(payload: QRScanPayload): Promise<QRScanResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/slip/scan-qr`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `QR scan failed: ${response.statusText}`);
      }

      const data: QRScanResponse = await response.json();
      return data;
    } catch (error) {
      console.error("QR scan error:", error);
      throw error instanceof Error ? error : new Error("Failed to scan QR code");
    }
  }

  // Parse QR code text to extract case_id and slip_ids
  // This is a helper method to parse different QR code formats
  parseQRCode(qrText: string): { case_id: number; slip_ids: number[] } | null {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(qrText);
      if (parsed.case_id && parsed.slip_ids) {
        return {
          case_id: Number(parsed.case_id),
          slip_ids: Array.isArray(parsed.slip_ids) 
            ? parsed.slip_ids.map((id: any) => Number(id))
            : [Number(parsed.slip_ids)]
        };
      }
    } catch (error) {
      // Not JSON, try other formats
    }

    // Try parsing URL format: /case/123/slip/456 or similar
    const urlMatch = qrText.match(/case\/(\d+)\/slip\/(\d+)/);
    if (urlMatch) {
      return {
        case_id: Number(urlMatch[1]),
        slip_ids: [Number(urlMatch[2])]
      };
    }

    // Try parsing simple format: CASE-123-SLIP-456
    const simpleMatch = qrText.match(/CASE-(\d+)-SLIP-(\d+)/i);
    if (simpleMatch) {
      return {
        case_id: Number(simpleMatch[1]),
        slip_ids: [Number(simpleMatch[2])]
      };
    }

    // Try parsing comma-separated format: case_id:123,slip_ids:456,789
    const csvMatch = qrText.match(/case_id:(\d+),slip_ids:([\d,]+)/);
    if (csvMatch) {
      const slip_ids = csvMatch[2].split(',').map(id => Number(id.trim()));
      return {
        case_id: Number(csvMatch[1]),
        slip_ids
      };
    }

    return null;
  }

  // Validate QR scan result
  validateQRScanResult(result: QRScanResponse): boolean {
    return (
      result.success &&
      Array.isArray(result.data) &&
      result.data.length > 0 &&
      typeof result.session_key === 'string' &&
      result.session_key.length > 0
    );
  }
}

// Export a singleton instance
export const slipService = new SlipService();
