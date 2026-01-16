import { apiGet, API_ROUTES, AuditLogsResponse } from "./config";

export const fetchAuditLogs = async (
  limit: number = 10,
  offset: number = 0
): Promise<AuditLogsResponse> => {
  return apiGet<AuditLogsResponse>(API_ROUTES.GET_AUDIT_LOGS, {
    limit,
    offset,
  });
};
