export const formatPublicId = (rawId, providedPublicId) => {
  if (providedPublicId) return providedPublicId;
  if (rawId === undefined || rawId === null || rawId === "") return "N/A";

  const source = String(rawId);
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }

  const normalized = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
  return `MDBX-${normalized.slice(0, 4)}-${normalized.slice(4)}`;
};

