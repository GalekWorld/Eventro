import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalLastUpdated } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookies | Eventro",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies"
      subtitle={`Ultima actualizacion: ${legalLastUpdated}`}
      sections={[
        {
          title: "Situacion actual",
          paragraphs: [
            "Con la configuracion actual del proyecto, Eventro utiliza sobre todo elementos tecnicos necesarios para el funcionamiento del servicio, como la sesion de acceso y ajustes tecnicos del navegador.",
            "No hemos detectado en el codigo actual un sistema de cookies analiticas o publicitarias de terceros que, por si mismo, obligue a mostrar un banner de consentimiento para aceptar o rechazar cookies no tecnicas.",
          ],
        },
        {
          title: "Cookies o elementos tecnicos",
          paragraphs: [
            "La cookie de sesion permite mantener tu acceso autenticado dentro de la plataforma.",
            "Tambien pueden utilizarse mecanismos locales del navegador para preferencias tecnicas, por ejemplo el tema visual o configuraciones internas de uso.",
          ],
        },
        {
          title: "Permisos del navegador",
          paragraphs: [
            "La geolocalizacion, las notificaciones del navegador y los avisos push no son cookies, pero si afectan a tu privacidad y al tratamiento de datos. Se activan mediante permisos del navegador o del dispositivo.",
          ],
        },
        {
          title: "Cuando hara falta banner",
          paragraphs: [
            "Si en el futuro se añaden cookies no tecnicas o tecnologias equivalentes con fines analiticos, publicitarios o de perfilado, debera actualizarse esta politica y habilitarse un sistema de consentimiento cuando corresponda.",
          ],
        },
      ]}
    />
  );
}
