import "server-only";

import { createHash, randomBytes } from "crypto";

const PREFIX = "sf_ext_";

export function createExtensionToken() {
  return `${PREFIX}${randomBytes(32).toString("base64url")}`;
}

export function hashExtensionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isExtensionToken(token: string) {
  return token.startsWith(PREFIX);
}
