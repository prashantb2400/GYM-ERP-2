"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
// Attempt to load .env.local from project root first, then .env
const rootDir = path_1.default.resolve(__dirname, '../../');
const envLocalPath = path_1.default.join(rootDir, '.env.local');
const envPath = path_1.default.join(rootDir, '.env');
// Ensure dotenv does not emit banner to stdout which breaks JSON-RPC
process.env.DOTENV_CONFIG_QUIET = 'true';
if (fs_1.default.existsSync(envLocalPath)) {
    dotenv_1.default.config({ path: envLocalPath, quiet: true });
}
else if (fs_1.default.existsSync(envPath)) {
    dotenv_1.default.config({ path: envPath, quiet: true });
}
else {
    dotenv_1.default.config({ quiet: true });
}
function getConfig() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const defaultGymId = process.env.GYMERP_GYM_ID || process.env.DEFAULT_GYM_ID;
    return {
        supabaseUrl,
        supabaseKey,
        defaultGymId,
        serverName: 'gym-erp-mcp',
        serverVersion: '1.0.0',
    };
}
