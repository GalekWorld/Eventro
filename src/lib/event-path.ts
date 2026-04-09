type EventPathInput = {
  id: string;
  slug?: string | null;
};

export function getEventPath(event: EventPathInput) {
  return `/events/${event.slug ?? event.id}`;
}
