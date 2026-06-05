import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export type EncryptedSecret = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
};

const ENCRYPTION_SECRET_ENV = "USER_API_KEY_ENCRYPTION_SECRET";

function getEncryptionKey() {
  const secret =
    process.env[ENCRYPTION_SECRET_ENV] ||
    process.env.API_KEY_ENCRYPTION_SECRET ||
    process.env.APP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret || secret === "local-service-role-key") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`${ENCRYPTION_SECRET_ENV} is required in production`);
    }

    return createHash("sha256")
      .update("smart-favorites-local-development-secret")
      .digest();
  }

  return createHash("sha256").update(secret).digest();
}

export function isEncryptedSecret(value: unknown): value is EncryptedSecret {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as EncryptedSecret).v === 1 &&
    (value as EncryptedSecret).alg === "aes-256-gcm" &&
    typeof (value as EncryptedSecret).iv === "string" &&
    typeof (value as EncryptedSecret).tag === "string" &&
    typeof (value as EncryptedSecret).data === "string"
  );
}

export function hasStoredSecret(value: unknown) {
  return (
    (typeof value === "string" && value.length > 0) ||
    isEncryptedSecret(value)
  );
}

export function encryptSecret(value: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptSecret(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (!isEncryptedSecret(value)) {
    return "";
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(value.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(value.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: unknown) {
  if (!hasStoredSecret(value)) {
    return "";
  }

  try {
    const plain = decryptSecret(value);
    return plain ? `••••${plain.slice(-4)}` : "••••";
  } catch {
    return "••••";
  }
}
