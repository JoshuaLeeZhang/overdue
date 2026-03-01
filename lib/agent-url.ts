/** Default URL for the agent. Override with AGENT_URL env. */
export const DEFAULT_AGENT_URL = 'https://learn.uwaterloo.ca';

export function getAgentUrl(): string {
  return process.env.AGENT_URL || DEFAULT_AGENT_URL;
}
