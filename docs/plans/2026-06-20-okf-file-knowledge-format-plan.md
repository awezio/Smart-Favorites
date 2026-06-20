# OKF File Knowledge Format Plan

**Date**: 2026-06-20  
**Scope**: Smart Favorites unified knowledge format  
**Goal**: Use Markdown, YAML, and folders to manage an open, portable, linkable personal knowledge base.

## Positioning

Here OKF means Open Knowledge Foundation. The product interpretation is:

- Knowledge should be accessible, editable, reusable, and exportable.
- Provenance should be preserved for every source, claim, and generated summary.
- Data should be machine-readable through simple open formats.
- A user should be able to inspect or move the knowledge base without being locked into Smart Favorites.

Smart Favorites should therefore support a file-first knowledge layer in addition to the current Supabase and pgvector layer. The database remains the serving and search index. The folder tree becomes the canonical portable format for export, sync, backup, review, and advanced user editing.

## Format Name

Use `SFKF` as the internal format name:

`Smart Favorites Knowledge Format`

The format is intentionally simple:

- Markdown for human-readable notes and source pages.
- YAML frontmatter for metadata on each Markdown file.
- YAML index files for graph edges, aliases, source registries, and import manifests.
- Folders for stable organization and partial export.

## Repository Layout

```text
knowledge/
  manifest.yaml
  indexes/
    nodes.yaml
    edges.yaml
    aliases.yaml
    tags.yaml
    sources.yaml
  bookmarks/
    2026/
      browser-bookmark-title.md
  stars/
    owner--repo.md
  documents/
    document-slug/
      index.md
      chunks/
        0001.md
        0002.md
  concepts/
    vector-database.md
    rag.md
  claims/
    claim-20260620-0001.md
  attachments/
    source-files/
  exports/
    sfkf-2026-06-20.zip
```

`knowledge/` is user-owned content. It can be placed inside the app workspace, exported as a zip, or synced to Git, WebDAV, Dropbox, iCloud, or another folder provider later.

## Markdown Node Format

Every knowledge item is a Markdown file with YAML frontmatter.

```markdown
---
id: k_bookmark_01jz8g6n8s4ct9n0a3t
type: bookmark
title: "Data Commons documentation"
canonical_url: "https://docs.datacommons.org/"
source_id: src_google_datacommons_docs
created_at: "2026-06-20T09:00:00Z"
updated_at: "2026-06-20T09:00:00Z"
license: unknown
provenance:
  imported_from: browser_extension
  original_id: chrome-bookmark-123
  content_hash: sha256:...
tags:
  - knowledge-graph
  - open-knowledge
links:
  - type: about
    target: concept:knowledge-graph
  - type: related
    target: concept:open-knowledge
embedding:
  status: indexed
  model: Xenova/all-MiniLM-L6-v2
---

# Data Commons documentation

Short user or AI generated summary.

## Notes

User notes live here. AI summaries must be labeled in metadata or in a section.

## Source Excerpt

Small excerpts or manually curated quotes only.
```

## YAML Indexes

Markdown files are the source users edit. YAML indexes are generated or updated by Smart Favorites.

### `manifest.yaml`

```yaml
format: sfkf
version: 0.1.0
generated_at: "2026-06-20T09:00:00Z"
owner:
  app: Smart Favorites
  user_id: user_uuid
defaults:
  license: private
  language: zh-CN
storage:
  canonical_root: knowledge
```

### `indexes/nodes.yaml`

```yaml
nodes:
  - id: k_bookmark_01jz8g6n8s4ct9n0a3t
    type: bookmark
    path: bookmarks/2026/data-commons-documentation.md
    title: Data Commons documentation
    source_id: src_google_datacommons_docs
    content_hash: sha256:...
```

### `indexes/edges.yaml`

```yaml
edges:
  - id: e_01jz8g8x4e
    subject: k_bookmark_01jz8g6n8s4ct9n0a3t
    predicate: about
    object: concept:knowledge-graph
    confidence: 0.86
    source: ai
    created_at: "2026-06-20T09:00:00Z"
```

### `indexes/sources.yaml`

```yaml
sources:
  - id: src_google_datacommons_docs
    name: Data Commons Docs
    url: https://docs.datacommons.org/
    provider: Google
    license: unknown
    access_type: public_web
    retrieved_at: "2026-06-20T09:00:00Z"
```

## Link Rules

Use three link layers:

1. Markdown links for human navigation:

```markdown
See also: [RAG](../concepts/rag.md)
```

2. Stable semantic links in frontmatter:

```yaml
links:
  - type: about
    target: concept:rag
```

3. Generated graph edges in `indexes/edges.yaml`.

This split lets users write normal notes while the app keeps a queryable graph.

## Node Types

Use a small controlled vocabulary first:

```yaml
node_types:
  - bookmark
  - star
  - document
  - chunk
  - concept
  - person
  - organization
  - tool
  - claim
  - collection
```

Use `concept` nodes for topics that connect content across bookmarks, stars, and documents. Use `claim` nodes only for statements that need provenance, verification, or citation.

## Relationship Types

```yaml
edge_types:
  - about
  - mentions
  - cites
  - derived_from
  - related
  - duplicate_of
  - parent_of
  - child_of
  - authored_by
  - maintained_by
  - implements
  - depends_on
```

The first implementation only needs `about`, `mentions`, `related`, `derived_from`, and `duplicate_of`.

## Sync Model

The app should treat Supabase as the online index and `knowledge/` as an open portable mirror.

```text
Browser extension / upload / GitHub import
  -> Supabase tables
  -> embedding and search indexes
  -> SFKF export files

Manual file edit / folder import
  -> parse Markdown frontmatter and YAML indexes
  -> validate IDs, hashes, links
  -> update Supabase
  -> regenerate affected indexes
```

Conflict policy:

- If database and file both changed, preserve both by creating a conflict note.
- Never silently overwrite user-edited Markdown body content.
- Generated metadata can be refreshed when `content_hash` matches.

## Database Mapping

Current tables can map into SFKF without a large rewrite:

| Current table | SFKF type | File path |
| --- | --- | --- |
| `bookmarks` | `bookmark` | `bookmarks/{year}/{slug}.md` |
| `github_stars` | `star` | `stars/{owner}--{repo}.md` |
| `documents` | `document` | `documents/{slug}/index.md` |
| `document_chunks` | `chunk` | `documents/{slug}/chunks/{index}.md` |

New tables recommended later:

- `knowledge_nodes`: canonical IDs and file paths.
- `knowledge_edges`: semantic links for graph traversal.
- `knowledge_sources`: provenance, license, source URL, import channel.
- `knowledge_sync_events`: import/export logs and conflict records.

## API Plan

Add these routes after the database mapping is in place:

```text
GET  /api/knowledge/export
POST /api/knowledge/import
GET  /api/knowledge/files
POST /api/knowledge/validate
POST /api/knowledge/links/rebuild
```

Tool API additions:

- `export_knowledge`
- `import_knowledge_folder`
- `validate_knowledge_format`
- `rebuild_knowledge_links`
- `find_related_nodes`

## UI Plan

Add a `Knowledge Files` panel under dashboard settings or knowledge management:

- Export as SFKF zip.
- Import SFKF folder or zip.
- Validate format and show broken links.
- Show source/license/provenance coverage.
- Show unresolved concepts and duplicate candidates.

In search/chat results, display:

- Source path, not only database ID.
- Provenance badge: user, browser import, GitHub import, document upload, AI generated.
- Link trail: source -> chunk -> concept -> related item.

## Implementation Phases

### Phase 1: File Format Contract

- Add TypeScript types for `KnowledgeNode`, `KnowledgeEdge`, `KnowledgeSource`, and `SfkfManifest`.
- Add validators for Markdown frontmatter and YAML indexes.
- Add slug and stable ID helpers.
- Add contract tests with fixture folders.

### Phase 2: One-way Export

- Export bookmarks, stars, documents, and chunks to `knowledge/`.
- Generate `manifest.yaml`, `nodes.yaml`, and `sources.yaml`.
- Preserve source hashes and timestamps.
- Zip export from `/api/knowledge/export`.

### Phase 3: Import and Validation

- Parse Markdown frontmatter and YAML indexes.
- Report broken links, duplicated IDs, missing sources, and unsupported node types.
- Import valid nodes into current Supabase tables.
- Create conflict notes for ambiguous edits.

### Phase 4: Graph Links

- Add `knowledge_edges`.
- Generate suggested `about`, `mentions`, and `related` links.
- Add user confirmation before writing AI-generated links.
- Include graph links in RAG context building.

### Phase 5: File-first Workflows

- Watch or rescan a configured local folder in self-hosted mode.
- Support Git-friendly exports with deterministic ordering.
- Add selective export by tag, collection, source, or date range.

## Acceptance Criteria

- A user can export their knowledge base as readable Markdown and YAML.
- Re-importing the export recreates the same bookmarks, stars, documents, chunks, and links.
- Every generated file has a stable ID, type, source, and content hash.
- Broken semantic links are detected before import.
- RAG can cite both the human-readable file path and original source.
- The format can be used without Smart Favorites by reading plain files.

## Immediate Next Tasks

1. Create `lib/knowledge-format/types.ts`.
2. Create `lib/knowledge-format/slug.ts`.
3. Create `lib/knowledge-format/export.ts`.
4. Create fixture `scripts/fixtures/sfkf-basic/`.
5. Add a contract test for deterministic export.
6. Add `/api/knowledge/export`.

