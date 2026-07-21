import axios from "axios";

export type ApiErrorData = Record<string, unknown>;

export const getApiErrorData = (error: unknown): ApiErrorData | undefined => {
  if (!axios.isAxiosError(error) || typeof error.response?.data !== "object" || error.response.data === null) {
    return undefined;
  }
  return error.response.data as ApiErrorData;
};

const errorValueToString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

export const getApiErrorField = (data: ApiErrorData | undefined, field: string) =>
  errorValueToString(data?.[field]);

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
  preferredFields: string[] = []
): string => {
  const data = getApiErrorData(error);
  for (const field of [...preferredFields, "error", "non_field_errors", "detail"]) {
    const message = errorValueToString(data?.[field]);
    if (message) return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
};
