export type VipSpaceInput = {
  howItIs?: string;
  price?: string;
  includes?: string;
  description?: string;
  adultsOnly?: boolean;
};

export type VipSpaceData = {
  howItIs: string;
  price: string;
  includes: string;
  description: string;
  adultsOnly: boolean;
};

function normalize(value: string | undefined) {
  return String(value ?? "").trim();
}

export function serializeVipSpace(input: VipSpaceInput) {
  return JSON.stringify({
    howItIs: normalize(input.howItIs),
    price: normalize(input.price),
    includes: normalize(input.includes),
    description: normalize(input.description),
    adultsOnly: Boolean(input.adultsOnly),
  });
}

export function parseVipSpace(value?: string | null): VipSpaceData | null {
  const raw = normalize(value ?? undefined);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      howItIs: normalize(typeof parsed.howItIs === "string" ? parsed.howItIs : ""),
      price: normalize(typeof parsed.price === "string" ? parsed.price : ""),
      includes: normalize(typeof parsed.includes === "string" ? parsed.includes : ""),
      description: normalize(typeof parsed.description === "string" ? parsed.description : ""),
      adultsOnly: parsed.adultsOnly === true,
    };
  } catch {
    return {
      howItIs: "",
      price: "",
      includes: "",
      description: raw,
      adultsOnly: false,
    };
  }
}

export function hasVipSpaceDetails(value?: VipSpaceData | null) {
  if (!value) return false;
  return Boolean(value.howItIs || value.price || value.includes || value.description);
}
