import type { IntegrationService, IntegrationStatus } from "~/types/integrations";

import { integrationRegistry } from "~/types/integrations";

export class SchoolMenuService implements IntegrationService {
  private integrationId: string;
  private baseUrl: string;
  private status: IntegrationStatus = {
    isConnected: false,
    lastChecked: new Date(),
  };

  constructor(integrationId: string, baseUrl: string) {
    this.integrationId = integrationId;
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    await this.validate();
  }

  async validate(): Promise<boolean> {
    return this.testConnection();
  }

  async getStatus(): Promise<IntegrationStatus> {
    return this.status;
  }

  async testConnection(): Promise<boolean> {
    try {
      const query: Record<string, string> = { integrationId: this.integrationId };
      if (this.integrationId === "temp" || this.integrationId.startsWith("temp-")) {
        query.baseUrl = this.baseUrl;
      }
      await $fetch("/api/integrations/schoolMenu", { query });
      this.status = { isConnected: true, lastChecked: new Date() };
      return true;
    }
    catch (error) {
      const message = (error as { data?: { message?: string } }).data?.message;
      this.status = {
        isConnected: false,
        lastChecked: new Date(),
        error: message || (error instanceof Error ? error.message : "Unknown error"),
      };
      return false;
    }
  }

  async getCapabilities(): Promise<string[]> {
    return integrationRegistry.get("meal:School Menu")?.capabilities || [];
  }
}

export function createSchoolMenuService(integrationId: string, _apiKey: string, baseUrl: string): SchoolMenuService {
  return new SchoolMenuService(integrationId, baseUrl);
}
