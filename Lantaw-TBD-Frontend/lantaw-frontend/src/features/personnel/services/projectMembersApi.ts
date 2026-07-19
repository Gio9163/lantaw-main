import api from "../../../api/client";
import type {
  InvitationValidation,
  ProjectInvitation,
  ProjectMember,
} from "../../../types/projectMember";

function results<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : data.results ?? [];
}

export const projectMembersApi = {
  async listMembers(projectId: number) {
    const response = await api.get(`/api/projects/${projectId}/members/`);
    return results<ProjectMember>(response.data);
  },

  async listInvitations(projectId: number) {
    const response = await api.get(`/api/projects/${projectId}/invitations/`);
    return results<ProjectInvitation>(response.data);
  },

  async createInvitation(
    projectId: number,
    payload: {
      email: string;
      allowed_role: "PROJECT_STAFF" | "EXECUTIVE";
      expires_at: string;
      message: string;
    }
  ) {
    const response = await api.post(
      `/api/projects/${projectId}/invitations/`,
      payload
    );
    return response.data as ProjectInvitation;
  },

  async revokeInvitation(projectId: number, invitationId: number) {
    const response = await api.post(
      `/api/projects/${projectId}/invitations/${invitationId}/revoke/`
    );
    return response.data as ProjectInvitation;
  },

  async validateInvitation(code: string) {
    const response = await api.get(`/api/invitations/${code}/validate/`);
    return response.data as InvitationValidation;
  },

  async acceptInvitation(code: string, accessToken: string) {
    return api.post(
      `/api/invitations/${code}/accept/`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  },
};
