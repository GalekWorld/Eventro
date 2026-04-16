type TicketSummaryInput = {
  name: string;
  description?: string | null;
  price?: unknown;
  isVisible?: boolean;
};

type EventPricingInput = {
  price?: unknown;
  ticketTypes?: TicketSummaryInput[] | null;
};

function normalizePrice(value: unknown) {
  if (value == null) return null;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : typeof value === "object" && value && "toString" in value
          ? Number(value.toString())
          : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getPrimaryTicketSummary(event: EventPricingInput) {
  const sorted = (event.ticketTypes ?? [])
    .map((ticketType) => ({
      ...ticketType,
      numericPrice: normalizePrice(ticketType.price),
    }))
    .sort((a, b) => {
      const aPrice = a.numericPrice ?? 0;
      const bPrice = b.numericPrice ?? 0;
      return aPrice - bPrice;
    });

  const primaryTicket = sorted[0] ?? null;
  const summaryPrice = primaryTicket?.numericPrice ?? normalizePrice(event.price);
  const summaryMessage = primaryTicket?.description?.trim() || primaryTicket?.name?.trim() || null;

  return {
    price: summaryPrice,
    message: summaryMessage,
  };
}
