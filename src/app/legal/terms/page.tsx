import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalContactEmail, legalControllerName, legalLastUpdated } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terminos | Eventro",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terminos y condiciones"
      subtitle={`Ultima actualizacion: ${legalLastUpdated}`}
      sections={[
        {
          title: "Objeto del servicio",
          paragraphs: [
            `${legalControllerName} es una plataforma para descubrir eventos, gestionar perfiles, seguir usuarios, publicar contenido, crear historias, comprar entradas y, en el caso de locales, administrar actividad relacionada con sus eventos.`,
            "El uso de la plataforma implica aceptar las condiciones publicadas en cada momento.",
          ],
        },
        {
          title: "Cuenta y uso permitido",
          paragraphs: [
            "Cada usuario es responsable de la veracidad de los datos aportados, de custodiar sus credenciales y de la actividad realizada desde su cuenta.",
            "No esta permitido suplantar identidades, acceder a cuentas ajenas sin autorizacion, utilizar la plataforma con fines fraudulentos o vulnerar derechos de terceros.",
          ],
        },
        {
          title: "Contenido y moderacion",
          paragraphs: [
            "No se permite publicar contenido ilicito, fraudulento, ofensivo, acosador o que vulnere derechos de terceros.",
            "Eventro puede moderar, ocultar, limitar o eliminar contenido, eventos o cuentas cuando sea necesario para seguridad, cumplimiento legal o proteccion de la comunidad.",
          ],
        },
        {
          title: "Eventos, entradas y pagos",
          paragraphs: [
            "Los locales son responsables de la informacion que publican sobre sus eventos y de las condiciones concretas asociadas a ellos.",
            "Las entradas y pagos pueden estar sujetos a reglas adicionales del organizador y del proveedor de pagos utilizado en la plataforma.",
          ],
        },
        {
          title: "Disponibilidad",
          paragraphs: [
            "Eventro puede modificar, actualizar, limitar o suspender funciones por razones tecnicas, de seguridad, mantenimiento o cumplimiento legal.",
            "No se garantiza disponibilidad absoluta e ininterrumpida del servicio.",
          ],
        },
        {
          title: "Contacto",
          paragraphs: [
            `Para consultas legales o relacionadas con estas condiciones puedes escribir a ${legalContactEmail}.`,
          ],
        },
      ]}
    />
  );
}
