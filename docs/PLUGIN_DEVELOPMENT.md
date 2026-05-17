# Plugin Development

Plugins should follow the `SmartFavoritesPlugin` contract described in `docs/PLUGIN_SPEC.md`.

## Manifest

A plugin manifest should declare:

- `name`
- `version`
- `apiVersion`
- `description`
- `permissions`
- tool definitions and hooks when needed

## Permissions

Request the narrowest permissions possible. Common permissions are `knowledge:read`, `documents:read`, `documents:write`, `bookmarks:write`, and `stats:read`.

## Tool Integration

Expose tools with JSON Schema input. Keep tool outputs stable and serializable so OpenAI, Claude, DeepSeek, and LangChain adapters can use the same contract.

## Release Checklist

Validate examples locally, document required environment variables, and avoid shipping secrets or user data in the package.
