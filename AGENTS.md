# Project development preferences

- Keep the product minimal and easy to understand: short labels, clear primary actions, and only information needed to make a decision. Remove repeated introductions, technical IDs, obsolete feature text, and decorative explanations. Keep essential validation, pricing, status, accessibility labels, and confirmation of consequential actions.
- Keep the schema easy to debug. Audit reads, writes, relations, historical compatibility, and migrations before removing a field; retire genuinely unused or redundant fields with a clear deployment order. Do not delete live data casually.
- Prefer maintainable, consistent implementations over adding fields or UI copy to make a workaround succeed. These preferences apply to future tasks in this repository.

- Prefer existing schema fields, relations, configuration, and established abstractions. Avoid adding database columns or tables when the feature can be implemented cleanly with the existing model.
- Use existing metadata only for data that naturally belongs there. Do not hide application state in user-facing text fields or introduce inconsistent encodings to avoid a migration.
- Keep behavior and data contracts consistent across the backend, frontend, invitation flows, and background workers. Prefer a coherent design over a workaround that merely succeeds.
- If a schema change is truly necessary, explain why existing structures cannot support the requirement and include migration and deployment compatibility in the implementation.
- Regression tests should cover the user's reported workflow and ensure compatibility with the existing Prisma schema/client. Do not require a schema change solely to fix an application bug.
- Use the real API in the product. Do not substitute mock data or fake successful actions when a request fails; preserve authentication handling and show the actual error. Isolated test fixtures are fine.
