# Claude Code Memory

## Cleanup TODO

- **`customDimKey` on Material type**: The `customDimKey` field still exists on the `Material` interface (`src/types/index.ts`) and is referenced in data migration (`src/lib/engine/compute.ts:migrateMat`), sample systems (`src/lib/sample-systems.ts`), and material creation sites (`MaterialsTab.tsx`, `SetupTab.tsx`, `CustomBracketsPanel.tsx`, `work.ts`). The UI for it ("Produces Dim") was removed because it was cosmetic metadata that didn't feed material output back into the compute engine. Safe to remove the field entirely and drop it from all creation/migration sites when doing a data migration pass.
