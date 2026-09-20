"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.resolveGymId = resolveGymId;
const supabase_js_1 = require("@supabase/supabase-js");
const config_js_1 = require("./config.js");
let clientInstance = null;
function getDb() {
    if (clientInstance) {
        return clientInstance;
    }
    const { supabaseUrl, supabaseKey } = (0, config_js_1.getConfig)();
    if (!supabaseUrl || !supabaseKey) {
        console.error('[gym-erp-mcp] Warning: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined. Database operations may fail.');
    }
    clientInstance = (0, supabase_js_1.createClient)(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key', {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
    return clientInstance;
}
function resolveGymId(suppliedGymId) {
    const { defaultGymId } = (0, config_js_1.getConfig)();
    const gymId = suppliedGymId || defaultGymId;
    if (!gymId) {
        throw new Error('Gym ID not provided. Either specify "gym_id" in the tool arguments or set GYMERP_GYM_ID in environment.');
    }
    return gymId;
}
