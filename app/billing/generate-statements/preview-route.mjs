export function buildStatementPreviewRoute(statementId) {
  const normalizedId = Number(statementId);
  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    return null;
  }

  return `/statement-preview/${normalizedId}`;
}
