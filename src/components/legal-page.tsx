import Link from "next/link";

export function LegalPage({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle: string;
  sections: Array<{
    title: string;
    paragraphs: string[];
  }>;
}) {
  return (
    <div className="mx-auto max-w-[935px] space-y-4">
      <section className="app-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="app-screen-title">{title}</h1>
            <p className="mt-2 app-screen-subtitle">{subtitle}</p>
          </div>
          <Link href="/profile/private" className="app-button-secondary">
            Volver al perfil
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/legal/privacy" className="app-button-secondary">
            Privacidad
          </Link>
          <Link href="/legal/cookies" className="app-button-secondary">
            Cookies
          </Link>
          <Link href="/legal/terms" className="app-button-secondary">
            Terminos
          </Link>
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.title} className="app-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
