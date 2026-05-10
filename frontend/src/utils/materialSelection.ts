export function deriveSelectedMaterialIds(
  materialIds: number[],
  currentSelectedIds: number[],
  userTouched: boolean,
): number[] {
  const availableMaterialIds = new Set(materialIds);

  if (!materialIds.length) {
    return currentSelectedIds.length ? [] : currentSelectedIds;
  }

  if (!userTouched) {
    return materialIds;
  }

  return currentSelectedIds.filter((id) => availableMaterialIds.has(id));
}
