import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalContactEmail, legalControllerName, legalLastUpdated } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacidad | Eventro",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacidad"
      subtitle={`Ultima actualizacion: ${legalLastUpdated}`}
      sections={[
        {
          title: "Responsable del tratamiento",
          paragraphs: [
            `${legalControllerName} es la plataforma responsable del tratamiento de los datos personales recogidos a traves de la app y del sitio web.`,
            `Para consultas sobre privacidad o ejercicio de derechos puedes escribir a ${legalContactEmail}.`,
          ],
        },
        {
          title: "Datos que tratamos",
          paragraphs: [
            "Podemos tratar datos de registro y cuenta como email, username, nombre, foto de perfil, bio y ciudad.",
            "Tambien tratamos el contenido que subes, como publicaciones, historias, mensajes, eventos, imagenes, tickets y la informacion asociada a tu perfil o a tu local.",
            "Si activas funciones concretas, tambien podemos tratar datos de ubicacion, dispositivos para avisos push, actividad dentro de la plataforma y datos necesarios para pagos o cobros.",
          ],
        },
        {
          title: "Finalidades",
          paragraphs: [
            "Usamos tus datos para prestarte el servicio, gestionar tu cuenta, permitir funciones sociales, mostrar eventos, mensajes, perfiles, seguidores, tickets y avisos.",
            "Tambien los usamos para seguridad, prevencion de fraude, moderacion, soporte, cumplimiento legal y mejora operativa de la plataforma.",
            "Cuando activas permisos del navegador o del dispositivo, tratamos los datos necesarios para esa funcionalidad concreta, por ejemplo geolocalizacion o notificaciones.",
          ],
        },
        {
          title: "Base juridica",
          paragraphs: [
            "La base principal es la ejecucion del servicio solicitado y de medidas precontractuales relacionadas con el registro, el uso de la plataforma y la compra de entradas.",
            "Algunas funciones se apoyan en tu consentimiento, como geolocalizacion, notificaciones o permisos del dispositivo.",
            "Determinados tratamientos pueden apoyarse tambien en intereses legitimos de seguridad, integridad de la plataforma y defensa frente a abusos o reclamaciones.",
          ],
        },
        {
          title: "Destinatarios",
          paragraphs: [
            "Tus datos pueden ser tratados por proveedores necesarios para operar Eventro, como hosting, base de datos, correo, notificaciones o pagos.",
            "Cuando se usan pagos, Stripe puede intervenir como proveedor segun la configuracion activa del servicio.",
            "No vendemos tus datos personales. Solo los comunicamos cuando es necesario para prestar el servicio, cumplir una obligacion legal o proteger la seguridad de la plataforma.",
          ],
        },
        {
          title: "Ubicacion y señales sociales",
          paragraphs: [
            "Si compartes ubicacion, la app puede mostrar tu posicion exacta o aproximada segun la configuracion que elijas y siempre dentro de la logica de visibilidad habilitada.",
            "Las compras de entradas, historias, follows y otras interacciones pueden generar avisos o señales sociales dentro de la plataforma segun las funciones activas.",
          ],
        },
        {
          title: "Conservacion",
          paragraphs: [
            "Los datos se conservan durante el tiempo necesario para prestar el servicio, mantener la cuenta, resolver incidencias, cumplir obligaciones legales y defender posibles reclamaciones.",
          ],
        },
        {
          title: "Tus derechos",
          paragraphs: [
            "Puedes solicitar acceso, rectificacion, supresion, oposicion, limitacion del tratamiento y portabilidad cuando proceda.",
            `Para ello puedes escribir a ${legalContactEmail}. Si lo consideras necesario, tambien puedes acudir a la AEPD u otra autoridad de control competente.`,
          ],
        },
      ]}
    />
  );
}
