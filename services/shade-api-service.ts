// Types for shade API functionality
export interface ShadeMatch {
  id: number;
  name: string;
  code: string;
  color_codes: {
    incisal?: string;    // For teeth shades
    body?: string;       // For teeth shades
    cervical?: string;   // For teeth shades
    top?: string;        // For gum shades
    middle?: string;     // For gum shades
    bottom?: string;     // For gum shades
  };
  brand: {
    id: number;
    name: string;
    system_name: string;
  };
  match_percentage: number;
  status: string;
  sequence: number;
  is_custom: boolean;
  customer_id: number | null;
}

export interface ShadeMatchResponse {
  success: boolean;
  message: string;
  data: ShadeMatch[];
  total_matches: number;
}

// Request types
export interface ShadeConversionRequest {
  shade_id?: number;
  brand_name?: string;
  shade_name?: string;
  limit?: number;
}

export interface TeethShadeColorMatchRequest {
  color?: string; // Single color for simplified API
  incisal_color?: string; // For advanced API
  body_color?: string;    // For advanced API
  cervical_color?: string; // For advanced API
  limit?: number;
}

export interface GumShadeColorMatchRequest {
  color?: string; // Single color for simplified API
  top_color?: string;    // For advanced API
  middle_color?: string; // For advanced API
  bottom_color?: string; // For advanced API
  limit?: number;
}

// Gum shade system interface based on actual API response
export interface GumShadeSystem {
  id: number;
  name: string;
  system_name: string;
  sequence: number;
  shades: GumShade[];
}

export interface GumShade {
  id: number;
  name: string;
  system_name: string | null;
  sequence: number;
  price: string;
  status: string;
}

export interface GumShadeSystemsResponse {
  success: boolean;
  message: string;
  data: GumShadeSystem[];
}

// Preferred Gum Shades API Types
export interface PreferredGumShadeBrand {
  id: number;
  name: string;
  system_name: string;
  status: string;
  sequence: number;
  translations: any[];
}

export interface PreferredGumShade {
  id: number;
  name: string;
  system_name: string | null;
  status: string;
  sequence: number;
  brand_id: number;
  color_code_top: string;
  color_code_middle: string;
  color_code_bottom: string;
  translations: any[];
}

export interface PreferredGumShadesResponse {
  message: string;
  data: {
    customer_id: number;
    customer_type: "lab" | "office";
    preferred_brand: PreferredGumShadeBrand;
    shades: PreferredGumShade[];
  };
}

export interface GetPreferredGumShadesRequest {
  customer_id: number;
}

export interface UpdatePreferredGumShadeBrandRequest {
  customer_id: number;
  preferred_gum_shade_brand_id: number;
}

export interface UpdatePreferredGumShadeBrandResponse {
  message: string;
  data: {
    id: number;
    name: string;
    type: "lab" | "office";
    preferred_gum_shade_brand_id: number;
  };
}

// Preferred Teeth Shades API Types
export interface PreferredTeethShadeBrand {
  id: number;
  name: string;
  system_name: string;
  status: string;
  sequence: number;
  translations: any[];
}

export interface PreferredTeethShade {
  id: number;
  name: string;
  system_name: string | null;
  status: string;
  sequence: number;
  brand_id: number;
  translations: any[];
}

export interface PreferredTeethShadesResponse {
  message: string;
  data: {
    customer_id: number;
    customer_type: "lab" | "office";
    preferred_brand: PreferredTeethShadeBrand;
    shades: PreferredTeethShade[];
  };
}

export interface GetPreferredTeethShadesRequest {
  customer_id: number;
}

export interface UpdatePreferredTeethShadeBrandRequest {
  customer_id: number;
  preferred_teeth_shade_brand_id: number;
}

export interface UpdatePreferredTeethShadeBrandResponse {
  message: string;
  data: {
    id: number;
    name: string;
    type: "lab" | "office";
    preferred_teeth_shade_brand_id: number;
  };
}


class ShadeApiService {
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

  // Fetch Gum Shade Systems API
  async getGumShadeSystems(labId: number, productId: number): Promise<GumShadeSystemsResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/slip/lab/${labId}/products/${productId}/gum-shades`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch gum shade systems: ${response.statusText}`);
      }

      const data: GumShadeSystemsResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Gum shade systems fetch error:", error);
      throw error instanceof Error ? error : new Error("Failed to fetch gum shade systems");
    }
  }

  // Teeth Shade Conversion API
  async convertTeethShade(request: ShadeConversionRequest): Promise<ShadeMatchResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/slip/shade-conversion`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Teeth shade conversion failed: ${response.statusText}`);
      }

      const data: ShadeMatchResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Teeth shade conversion error:", error);
      throw error instanceof Error ? error : new Error("Failed to convert teeth shade");
    }
  }

  // Gum Shade Conversion API
  async convertGumShade(request: ShadeConversionRequest): Promise<ShadeMatchResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/slip/gum-shade-conversion`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Gum shade conversion failed: ${response.statusText}`);
      }

      const data: ShadeMatchResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Gum shade conversion error:", error);
      throw error instanceof Error ? error : new Error("Failed to convert gum shade");
    }
  }

  // Teeth Shade Color Match API (Simplified - single color)
  async matchTeethShadeColor(request: TeethShadeColorMatchRequest): Promise<ShadeMatchResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/slip/teeth-shade-color-match`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Teeth shade color match failed: ${response.statusText}`);
      }

      const data: ShadeMatchResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Teeth shade color match error:", error);
      throw error instanceof Error ? error : new Error("Failed to match teeth shade color");
    }
  }

  // Gum Shade Color Match API (Simplified - single color)
  async matchGumShadeColor(request: GumShadeColorMatchRequest): Promise<ShadeMatchResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/slip/gum-shade-color-match`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Gum shade color match failed: ${response.statusText}`);
      }

      const data: ShadeMatchResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Gum shade color match error:", error);
      throw error instanceof Error ? error : new Error("Failed to match gum shade color");
    }
  }


  // Helper method to extract dominant color from an image element
  extractColorFromImage(imageElement: HTMLImageElement, x: number, y: number): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '#FFFFFF';

      canvas.width = 1;
      canvas.height = 1;
      
      ctx.drawImage(imageElement, x, y, 1, 1, 0, 0, 1, 1);
      const imageData = ctx.getImageData(0, 0, 1, 1);
      const [r, g, b] = imageData.data;
      
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    } catch (error) {
      console.error('Error extracting color from image:', error);
      return '#FFFFFF';
    }
  }

  // Helper method to validate hex color
  isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  // Helper method to normalize hex color
  normalizeHexColor(color: string): string {
    if (!color.startsWith('#')) {
      color = '#' + color;
    }
    if (color.length === 4) {
      // Convert #RGB to #RRGGBB
      color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color.toUpperCase();
  }

  // Get Preferred Gum Shades API
  async getPreferredGumShades(request: GetPreferredGumShadesRequest): Promise<PreferredGumShadesResponse> {
    console.log('ShadeApiService: getPreferredGumShades called with request:', request);
    
    try {
      const response = await fetch(`${this.API_BASE_URL}/preferred-shades/gum-shades`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      console.log('ShadeApiService: Gum shades response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('ShadeApiService: Gum shades error response:', errorData);
        throw new Error(errorData.message || `Failed to fetch preferred gum shades: ${response.statusText}`);
      }

      const data: PreferredGumShadesResponse = await response.json();
      console.log('ShadeApiService: Gum shades success response:', data);
      return data;
    } catch (error) {
      console.error("Preferred gum shades fetch error:", error);
      throw error instanceof Error ? error : new Error("Failed to fetch preferred gum shades");
    }
  }

  // Update Preferred Gum Shade Brand API
  async updatePreferredGumShadeBrand(request: UpdatePreferredGumShadeBrandRequest): Promise<UpdatePreferredGumShadeBrandResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/preferred-shades/gum-shade-brand`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update preferred gum shade brand: ${response.statusText}`);
      }

      const data: UpdatePreferredGumShadeBrandResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Update preferred gum shade brand error:", error);
      throw error instanceof Error ? error : new Error("Failed to update preferred gum shade brand");
    }
  }

  // Get Preferred Teeth Shades API
  async getPreferredTeethShades(request: GetPreferredTeethShadesRequest): Promise<PreferredTeethShadesResponse> {
    console.log('ShadeApiService: getPreferredTeethShades called with request:', request);
    console.log('ShadeApiService: API_BASE_URL:', this.API_BASE_URL);
    
    try {
      const url = `${this.API_BASE_URL}/preferred-shades/teeth-shades`;
      console.log('ShadeApiService: Making request to:', url);
      
      const response = await fetch(url, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      console.log('ShadeApiService: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('ShadeApiService: Error response:', errorData);
        throw new Error(errorData.message || `Failed to fetch preferred teeth shades: ${response.statusText}`);
      }

      const data: PreferredTeethShadesResponse = await response.json();
      console.log('ShadeApiService: Success response:', data);
      return data;
    } catch (error) {
      console.error("Preferred teeth shades fetch error:", error);
      throw error instanceof Error ? error : new Error("Failed to fetch preferred teeth shades");
    }
  }

  // Update Preferred Teeth Shade Brand API
  async updatePreferredTeethShadeBrand(request: UpdatePreferredTeethShadeBrandRequest): Promise<UpdatePreferredTeethShadeBrandResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/preferred-shades/teeth-shade-brand`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update preferred teeth shade brand: ${response.statusText}`);
      }

      const data: UpdatePreferredTeethShadeBrandResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Update preferred teeth shade brand error:", error);
      throw error instanceof Error ? error : new Error("Failed to update preferred teeth shade brand");
    }
  }
}

// Export a singleton instance
export const shadeApiService = new ShadeApiService();


