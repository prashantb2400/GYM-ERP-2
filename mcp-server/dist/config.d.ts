export interface McpServerConfig {
    supabaseUrl: string;
    supabaseKey: string;
    defaultGymId?: string;
    serverName: string;
    serverVersion: string;
}
export declare function getConfig(): McpServerConfig;
