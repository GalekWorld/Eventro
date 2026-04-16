const POST_META_PREFIX = "\n\n<!--eventro:post-meta:";
const POST_META_SUFFIX = "-->";

type PostMeta = {
  location?: string;
};

function normalizeLocation(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text.slice(0, 120) : null;
}

export function buildPostContent(content: string, location?: string | null) {
  const cleanContent = String(content).trim();
  const cleanLocation = normalizeLocation(location);

  if (!cleanLocation) {
    return cleanContent;
  }

  const meta = JSON.stringify({ location: cleanLocation } satisfies PostMeta);
  return `${cleanContent}${POST_META_PREFIX}${meta}${POST_META_SUFFIX}`;
}

export function parsePostContent(rawContent: string | null | undefined) {
  const source = String(rawContent ?? "");
  const prefixIndex = source.indexOf(POST_META_PREFIX);

  if (prefixIndex === -1) {
    return { content: source.trim(), location: null as string | null };
  }

  const suffixIndex = source.indexOf(POST_META_SUFFIX, prefixIndex + POST_META_PREFIX.length);
  if (suffixIndex === -1) {
    return { content: source.trim(), location: null as string | null };
  }

  const visibleContent = source.slice(0, prefixIndex).trim();
  const metaRaw = source.slice(prefixIndex + POST_META_PREFIX.length, suffixIndex).trim();

  try {
    const parsed = JSON.parse(metaRaw) as PostMeta;
    return {
      content: visibleContent,
      location: normalizeLocation(parsed.location),
    };
  } catch {
    return {
      content: visibleContent || source.trim(),
      location: null as string | null,
    };
  }
}
