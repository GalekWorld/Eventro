import Link from "next/link";

function buildHref(pathname: string, params: URLSearchParams, page: number) {
  const nextParams = new URLSearchParams(params);

  if (page <= 1) {
    nextParams.delete("page");
  } else {
    nextParams.set("page", String(page));
  }

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function PaginationControls({
  pathname,
  currentPage,
  totalPages,
  params,
}: {
  pathname: string;
  currentPage: number;
  totalPages: number;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  return (
    <nav className="flex flex-col gap-3 rounded-[20px] border border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Página {currentPage} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          href={buildHref(pathname, searchParams, currentPage - 1)}
          aria-disabled={currentPage <= 1}
          className={`app-button-secondary ${currentPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
        >
          Anterior
        </Link>
        <Link
          href={buildHref(pathname, searchParams, currentPage + 1)}
          aria-disabled={currentPage >= totalPages}
          className={`app-button-primary ${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
        >
          Siguiente
        </Link>
      </div>
    </nav>
  );
}
