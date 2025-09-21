import { apiGet, API_ROUTES } from "./config";

interface AgentThoughtResponse {
  thoughtId: number;
  agent_role: string;
  thought: string;
  createdAt: string;
  formatted_time: string;
  execution_mode: string;
  crew_id: string | null;
}

interface AgentThoughtsApiResponse {
  results: AgentThoughtResponse[];
  status?: 'success' | 'error';
  message?: string;
}

class AgentService {
  async getAgentThoughts(hours: number = 24, page: number = 1, pageSize: number = 20): Promise<AgentThoughtsApiResponse> {
    try {
      const params = { hours, page, page_size: pageSize } as const;
      const data = await apiGet<any>(API_ROUTES.GET_AGENT_THOUGHTS, params);
      return {
        results: data.results || [],
        status: 'success'
      };
    } catch (error) {
      console.error('Error fetching agent thoughts:', error);
      return {
        results: [],
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Get the latest agent thought for display
  async getLatestAgentThought(): Promise<AgentThoughtResponse | null> {
    try {
      const response = await this.getAgentThoughts(24, 1, 1);
      if (response.results && response.results.length > 0) {
        return response.results[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching latest agent thought:', error);
      return null;
    }
  }
}

export const agentService = new AgentService();
export type { AgentThoughtResponse, AgentThoughtsApiResponse };
