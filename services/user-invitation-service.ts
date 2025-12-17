// User Invitation Service for Doctor Invitation During Slip Creation
// Based on the API documentation provided

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Helper to get token from localStorage
const getToken = (): string | null => {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
};

// Helper to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Types
export interface InviteDoctorPayload {
  customer_id: number;
  name: string;
  email: string;
  phone?: string;
  role: "doctor" | "doctor_admin";
}

export interface InvitationData {
  token: string;
  status: "Pending" | "Accepted" | "Expired" | "Rejected";
  name: string;
  email: string;
  role: string;
  customer: {
    id: number;
    name: string;
    type: string;
  };
  expires_at: string;
  created_at?: string;
  user_exists: boolean;
  already_linked: boolean;
  requires_doctor_documents: boolean;
  reminder_count?: number;
  reminder_sent_at?: string;
}

export interface UserData {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  status: "Active" | "Inactive" | "Suspended" | "Pending" | "Archived" | "Invited";
  phone?: string;
}

export interface InviteDoctorResponse {
  message: string;
  data: {
    invitation: InvitationData;
    user: UserData;
    created: boolean;
  };
}

export interface PendingInvitationsResponse {
  message: string;
  data: InvitationData[];
}

export interface UserInvitationStatusResponse {
  message: string;
  data: {
    user_id: number;
    user_status: string;
    pending_invitations: Array<{
      id: number;
      token: string;
      status: string;
      customer: {
        id: number;
        name: string;
      };
      expires_at: string;
    }>;
    expired_invitations: Array<{
      id: number;
      token: string;
      status: string;
      customer: {
        id: number;
        name: string;
      };
      expires_at: string;
    }>;
    has_pending: boolean;
    has_expired: boolean;
  };
}

export interface ResendInvitationResponse {
  message: string;
  data: InvitationData;
}

export interface ChangeDoctorResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    case_number: string;
    lab_id: number;
    office_id: number;
    doctor: number;
    patient_name: string;
    doctor_details: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

class UserInvitationService {
  /**
   * Invite a doctor during slip creation
   * Creates a user immediately with "Invited" status
   */
  async inviteDoctor(payload: InviteDoctorPayload): Promise<InviteDoctorResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/user-invitations/invite-doctor`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized - Redirecting to login");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to invite doctor: ${response.statusText}`);
      }

      const data: InviteDoctorResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Invite doctor error:", error);
      throw error instanceof Error ? error : new Error("Failed to invite doctor");
    }
  }

  /**
   * Get pending invitations for a customer
   */
  async getPendingInvitations(
    customerId: number,
    daysOld: number = 7
  ): Promise<PendingInvitationsResponse> {
    try {
      const params = new URLSearchParams({
        customer_id: customerId.toString(),
        days_old: daysOld.toString(),
      });

      const response = await fetch(
        `${API_BASE_URL}/user-invitations/pending?${params.toString()}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized - Redirecting to login");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to get pending invitations: ${response.statusText}`
        );
      }

      const data: PendingInvitationsResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Get pending invitations error:", error);
      throw error instanceof Error ? error : new Error("Failed to get pending invitations");
    }
  }

  /**
   * Get invitation status for a specific user
   */
  async getUserInvitationStatus(userId: number): Promise<UserInvitationStatusResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/user-invitations/user/${userId}/status`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized - Redirecting to login");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to get invitation status: ${response.statusText}`
        );
      }

      const data: UserInvitationStatusResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Get invitation status error:", error);
      throw error instanceof Error ? error : new Error("Failed to get invitation status");
    }
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: number): Promise<ResendInvitationResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/user-invitations/${invitationId}/resend`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      if (response.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized - Redirecting to login");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to resend invitation: ${response.statusText}`);
      }

      const data: ResendInvitationResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Resend invitation error:", error);
      throw error instanceof Error ? error : new Error("Failed to resend invitation");
    }
  }

  /**
   * Change doctor on a case
   */
  async changeCaseDoctor(
    caseId: number,
    doctorId: number
  ): Promise<ChangeDoctorResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/slip/case/${caseId}/doctor`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ doctor_id: doctorId }),
      });

      if (response.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized - Redirecting to login");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to change doctor: ${response.statusText}`);
      }

      const data: ChangeDoctorResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Change case doctor error:", error);
      throw error instanceof Error ? error : new Error("Failed to change doctor");
    }
  }
}

// Export singleton instance
export const userInvitationService = new UserInvitationService();
export default userInvitationService;























