import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiAuditLogRecord, ApiKeyRecord, ToolExecutionContext } from "@/types";

const DEFAULT_TOOL_PERMISSIONS = [
  "knowledge:read",
  "knowledge:write",
  "documents:read",
  "documents:write",
  "bookmarks:write",
  "stats:read",
] as const;

export function buildDefaultToolPermissions() {
  return [...DEFAULT_TOOL_PERMISSIONS];
}

export function generateApiKey() {
  const prefix = randomBytes(4).toString("hex");
  const secret = randomBytes(24).toString("hex");
  return `sfk_${prefix}_${secret}`;
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function maskApiKey(key: string) {
  const parts = key.split("_");
  if (parts.length < 3) {
    return `****${key.slice(-8)}`;
  }

  return `${parts[0]}_${parts[1]}_****${parts[2].slice(-4)}`;
}

export function normalizePermissions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export async function resolveToolAuth(
  request: NextRequest
): Promise<ToolExecutionContext> {
  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (bearerToken) {
    const apiKey = await resolveApiKey(bearerToken);
    if (apiKey) {
      return {
        userId: apiKey.user_id,
        authType: "api_key",
        apiKeyId: apiKey.id,
        permissions: apiKey.permissions,
      };
    }
  }

  const { userId } = await getAuthUser(request);
  return {
    userId,
    authType: "session",
    permissions: ["*"],
  };
}

export async function resolveApiKey(token: string) {
  const supabase = createAdminClient();
  const keyHash = hashApiKey(token);
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("enabled", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const record = data as ApiKeyRecord | null;
  if (!record) {
    return null;
  }

  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    return null;
  }

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", record.id);

  return {
    ...record,
    permissions: normalizePermissions(record.permissions),
  };
}

export async function listApiKeys(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as ApiKeyRecord[]).map((item) => ({
    ...item,
    permissions: normalizePermissions(item.permissions),
  }));
}

export async function createApiKeyRecord(
  userId: string,
  payload: {
    name: string;
    permissions?: string[];
    expiresAt?: string | null;
  }
) {
  const supabase = createAdminClient();
  const token = generateApiKey();
  const keyPrefix = token.split("_")[1] || "tool";
  const keyHash = hashApiKey(token);

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      name: payload.name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      permissions: payload.permissions?.length
        ? payload.permissions
        : buildDefaultToolPermissions(),
      expires_at: payload.expiresAt || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    key: token,
    record: {
      ...(data as ApiKeyRecord),
      permissions: normalizePermissions((data as ApiKeyRecord).permissions),
    },
  };
}

export async function updateApiKeyRecord(
  userId: string,
  keyId: string,
  updates: Partial<{
    name: string;
    permissions: string[];
    enabled: boolean;
    expires_at: string | null;
  }>
) {
  const supabase = createAdminClient();
  const payload: Record<string, unknown> = {};

  if (updates.name !== undefined) {
    payload.name = updates.name;
  }
  if (updates.permissions !== undefined) {
    payload.permissions = updates.permissions;
  }
  if (updates.enabled !== undefined) {
    payload.enabled = updates.enabled;
  }
  if (updates.expires_at !== undefined) {
    payload.expires_at = updates.expires_at;
  }

  const { data, error } = await supabase
    .from("api_keys")
    .update(payload)
    .eq("id", keyId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...(data as ApiKeyRecord),
    permissions: normalizePermissions((data as ApiKeyRecord).permissions),
  };
}

export async function deleteApiKeyRecord(userId: string, keyId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", keyId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function listApiAuditLogs(userId: string, limit = 50, offset = 0) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_audit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as ApiAuditLogRecord[];
}

export async function recordApiAuditLog(entry: {
  userId: string;
  apiKeyId?: string | null;
  toolName: string;
  action: string;
  requestMeta?: Record<string, unknown>;
  responseMeta?: Record<string, unknown>;
  statusCode?: number | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("api_audit_logs").insert({
    user_id: entry.userId,
    api_key_id: entry.apiKeyId || null,
    tool_name: entry.toolName,
    action: entry.action,
    request_meta: entry.requestMeta || {},
    response_meta: entry.responseMeta || {},
    status_code: entry.statusCode ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
