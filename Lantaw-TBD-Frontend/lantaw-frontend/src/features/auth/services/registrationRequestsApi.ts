import api from "../../../api/client";
import type { RegistrationRequest } from "../../../types/registrationRequest";

function extractResults(data: unknown): RegistrationRequest[] {
  if (Array.isArray(data)) return data as RegistrationRequest[];
  if (data && typeof data === "object" && "results" in data) {
    const results = (data as { results?: unknown }).results;
    return Array.isArray(results) ? (results as RegistrationRequest[]) : [];
  }
  return [];
}

export async function getPendingRegistrationRequests() {
  const response = await api.get("/api/registration-requests/?status=PENDING");
  return extractResults(response.data);
}

export async function approveRegistrationRequest(id: number) {
  const response = await api.post(`/api/registration-requests/${id}/approve/`);
  return response.data as RegistrationRequest;
}

export async function rejectRegistrationRequest(id: number, reason: string) {
  const response = await api.post(`/api/registration-requests/${id}/reject/`, {
    reason,
  });
  return response.data as RegistrationRequest;
}
