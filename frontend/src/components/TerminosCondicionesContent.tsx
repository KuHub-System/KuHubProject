import React from 'react';
import { Icon } from '@iconify/react';

const TerminosCondicionesContent: React.FC = () => (
  <div className="space-y-5 text-sm text-default-700 dark:text-default-300 leading-relaxed">

    <p className="text-xs text-default-500 italic">
      Última actualización: junio de 2026 · Versión 1.0. Le solicitamos leer este
      documento en su totalidad antes de continuar. La aceptación es requisito
      indispensable para acceder a la plataforma.
    </p>

    <section className="space-y-2">
      <h3 className="font-bold text-secondary dark:text-foreground flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">1</span>
        Objeto y aceptación
      </h3>
      <p>
        <strong>KuHub</strong> es una plataforma de gestión de bodega, inventario y
        procesos académico-gastronómicos de uso interno institucional. Al marcar
        «Acepto los términos» usted declara haber leído, comprendido y aceptado de
        forma <strong>libre, informada, específica, previa e inequívoca</strong> el
        presente documento, que constituye un acuerdo vinculante entre usted (el
        «Usuario») y la institución responsable del sistema.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="font-bold text-secondary dark:text-foreground flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">2</span>
        Tratamiento de datos personales
      </h3>
      <p>
        En el marco de su operación, KuHub recopila y trata los siguientes
        <strong> datos personales de carácter identificativo</strong> (no
        constituyen «datos sensibles» en los términos de la legislación chilena):
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Nombre completo y apellidos del usuario.</li>
        <li>Correo electrónico institucional.</li>
        <li>Número de teléfono de contacto.</li>
        <li>Rol y registros de actividad dentro del sistema (último acceso, acciones).</li>
        <li>
          Datos de proveedores vinculados, incluyendo <strong>RUT</strong>, razón
          social y datos de contacto comercial.
        </li>
      </ul>
      <p>
        <strong>Finalidad:</strong> estos datos se tratan con el único propósito de
        gestionar el inventario, las solicitudes, los pedidos a proveedores y la
        administración interna de usuarios y permisos. No se utilizarán para fines
        distintos a los aquí declarados, ni serán cedidos, vendidos o transferidos a
        terceros ajenos al ámbito institucional, salvo obligación legal o
        requerimiento de autoridad competente.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="font-bold text-secondary dark:text-foreground flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">3</span>
        Marco legal aplicable
      </h3>
      <p>
        El tratamiento de datos personales se realiza conforme a la normativa
        chilena vigente:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Ley N° 19.628 sobre Protección de la Vida Privada</strong>,
          actualmente vigente, que regula el tratamiento de datos personales y exige
          el consentimiento del titular.
        </li>
        <li>
          <strong>Ley N° 21.719</strong> (publicada el 13 de diciembre de 2024), que
          moderniza el régimen de protección de datos, crea la Agencia de Protección
          de Datos Personales y <strong>entrará en vigencia el 1 de diciembre de
          2026</strong>, reemplazando a la Ley N° 19.628. La institución adoptará las
          medidas necesarias para adecuarse plenamente a esta normativa.
        </li>
      </ul>
    </section>

    <section className="space-y-2">
      <h3 className="font-bold text-secondary dark:text-foreground flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">4</span>
        Derechos del titular de los datos
      </h3>
      <p>
        Como titular de sus datos personales, usted puede ejercer en cualquier
        momento los siguientes derechos ante la institución:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Acceso:</strong> conocer qué datos suyos se tratan.</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos o desactualizados.</li>
        <li><strong>Cancelación o supresión:</strong> solicitar la eliminación cuando ya no sean necesarios.</li>
        <li><strong>Oposición:</strong> oponerse a un tratamiento específico.</li>
        <li><strong>Portabilidad:</strong> obtener sus datos en un formato estructurado.</li>
        <li><strong>Bloqueo:</strong> suspender temporalmente el tratamiento.</li>
      </ul>
      <p>
        Asimismo, el consentimiento aquí otorgado es <strong>revocable</strong> en
        cualquier momento mediante solicitud al administrador del sistema, sin efecto
        retroactivo sobre el tratamiento ya realizado.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="font-bold text-secondary dark:text-foreground flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">5</span>
        Uso aceptable y confidencialidad
      </h3>
      <p>
        El acceso al sistema implica el manejo de información operativa, académica y
        comercial de carácter reservado. Queda estrictamente prohibido:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Compartir, ceder o divulgar las credenciales de acceso a terceros.</li>
        <li>Extraer, copiar, reproducir o distribuir información del sistema sin autorización expresa.</li>
        <li>Utilizar la plataforma para fines distintos a la gestión institucional.</li>
        <li>Intentar acceder a módulos o datos para los cuales no se cuenta con autorización.</li>
      </ul>
      <p>
        El Usuario es responsable de mantener la confidencialidad de su cuenta y de
        toda actividad realizada bajo sus credenciales.
      </p>
    </section>

    <section className="space-y-2">
      <h3 className="font-bold text-secondary dark:text-foreground flex items-center gap-2">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">6</span>
        Seguridad e incumplimiento
      </h3>
      <p>
        La institución implementa medidas técnicas y organizativas razonables para
        proteger los datos frente a pérdida, acceso no autorizado o uso indebido. No
        obstante, el incumplimiento de estos términos podrá derivar en la suspensión
        o revocación inmediata del acceso, sin perjuicio de las acciones
        disciplinarias, civiles o penales que correspondan conforme a la normativa
        vigente.
      </p>
    </section>

    <div className="bg-warning-50 dark:bg-warning-50/10 border border-warning-200 dark:border-warning-100/20 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <Icon icon="lucide:alert-triangle" className="text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-warning-700 dark:text-warning-400">
          Si <strong>no acepta</strong> estos términos, su sesión se cerrará y no
          podrá acceder al sistema. Para más información o para ejercer sus derechos
          como titular, contacte al administrador de la plataforma.
        </p>
      </div>
    </div>

  </div>
);

export default TerminosCondicionesContent;
