import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser, adminErrorResponse } from "@/lib/auth/admin";
import { PROVIDER_DEFINITIONS } from "@/lib/ai/provider-registry";
import { getEnvProviderConfigured } from "@/lib/ai/provider-config";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(request);
    return NextResponse.json({
      providers: PROVIDER_DEFINITIONS.map((provider) => ({
        ...provider,
        envConfigured: getEnvProviderConfigured(provider.id),
      })),
      defaultProvider: process.env.DEFAULT_LLM_PROVIDER || "deepseek",
      defaultModel: process.env.DEFAULT_LLM_MODEL || "",
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
