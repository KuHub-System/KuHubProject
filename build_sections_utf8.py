# Helper to generate XML paragraphs and tables for the new sections

def h1(text):
    return f'''    <w:p>
      <w:pPr><w:pStyle w:val="Ttulo1"/></w:pPr>
      <w:r><w:t>{text}</w:t></w:r>
    </w:p>'''

def h2(text):
    return f'''    <w:p>
      <w:pPr><w:pStyle w:val="Ttulo2"/></w:pPr>
      <w:r><w:t>{text}</w:t></w:r>
    </w:p>'''

def h3(text):
    return f'''    <w:p>
      <w:pPr><w:pStyle w:val="Ttulo3"/></w:pPr>
      <w:r><w:t>{text}</w:t></w:r>
    </w:p>'''

def para(text, spacing=160):
    return f'''    <w:p>
      <w:pPr><w:spacing w:after="{spacing}"/></w:pPr>
      <w:r><w:t xml:space="preserve">{text}</w:t></w:r>
    </w:p>'''

def bold_para(label, text, spacing=160):
    return f'''    <w:p>
      <w:pPr><w:spacing w:after="{spacing}"/></w:pPr>
      <w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">{label} </w:t></w:r>
      <w:r><w:t xml:space="preserve">{text}</w:t></w:r>
    </w:p>'''

def bullet(text):
    return f'''    <w:p>
      <w:pPr><w:pStyle w:val="Prrafodelista"/></w:pPr>
      <w:r><w:t xml:space="preserve">{text}</w:t></w:r>
    </w:p>'''

def spacer():
    return '''    <w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>'''

def page_break():
    return '''    <w:p>
      <w:pPr><w:pageBreakBefore/></w:pPr>
    </w:p>'''

def header_cell(text, width):
    return f'''        <w:tc>
          <w:tcPr>
            <w:tcW w:w="{width}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="2E5FA3"/>
            <w:tcMar>
              <w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>
              <w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="FFFFFF"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t>{text}</w:t></w:r></w:p>
        </w:tc>'''

def data_cell(text, width, shade=False):
    fill = "EBF0F8" if shade else "FFFFFF"
    return f'''        <w:tc>
          <w:tcPr>
            <w:tcW w:w="{width}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>
            <w:tcMar>
              <w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>
              <w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p><w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">{text}</w:t></w:r></w:p>
        </w:tc>'''

def table(headers_widths, rows):
    total = sum(w for _, w in headers_widths)
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for _, w in headers_widths)
    header_row = "\n".join(header_cell(h, w) for h, w in headers_widths)
    data_rows = ""
    for i, row in enumerate(rows):
        cells = "\n".join(data_cell(cell, headers_widths[j][1], i % 2 == 0)
                         for j, cell in enumerate(row))
        data_rows += f'''      <w:tr>
{cells}
      </w:tr>\n'''

    return f'''    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="{total}" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="ADBCD8"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="ADBCD8"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="ADBCD8"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="ADBCD8"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="ADBCD8"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="ADBCD8"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>{grid}</w:tblGrid>
      <w:tr>
{header_row}
      </w:tr>
{data_rows}    </w:tbl>'''

# Build all sections
sections = []

# PAGE BREAK before new sections
sections.append(page_break())

# SECTION 5
sections.append(h1("5. Relaciones entre Tablas"))
sections.append(h2("5.1 Relaciones Uno a Uno (1:1)"))
sections.append(para("Las relaciones 1:1 garantizan unicidad estricta entre entidades complementarias:"))
sections.append(bullet("producto ↔ inventario: cada producto tiene exactamente un registro de stock en bodega principal."))
sections.append(bullet("inventario ↔ bodega_transito: cada registro de inventario tiene un espejo de stock en tránsito."))
sections.append(bullet("solicitud ↔ motivo_rechazo_solicitud: una solicitud puede tener a lo sumo un motivo de rechazo, el cual se elimina automáticamente si la solicitud cambia de estado."))

sections.append(h2("5.2 Relaciones Uno a Muchos (1:N)"))
sections.append(para("A continuación se listan las relaciones 1:N agrupadas por módulo:"))
sections.append(table(
    [("Módulo", 2200), ("Relación", 4000), ("Descripción", 3160)],
    [
        ["Seguridad", "rol → usuario", "Un rol agrupa múltiples usuarios."],
        ["Seguridad", "usuario → refresh_token", "Un usuario puede tener varios tokens JWT activos."],
        ["Seguridad", "usuario → movimiento", "Un usuario genera múltiples movimientos de stock."],
        ["Seguridad", "usuario → solicitud", "Un usuario puede gestionar múltiples solicitudes."],
        ["Académico", "asignatura → seccion", "Una asignatura tiene múltiples secciones."],
        ["Académico", "seccion → reserva_sala", "Una sección puede tener múltiples reservas de sala."],
        ["Académico", "seccion → docente_seccion", "Una sección puede tener múltiples docentes asignados."],
        ["Académico", "seccion → solicitud", "Una sección puede originar múltiples solicitudes de insumos."],
        ["Inventario", "categoria → producto", "Una categoría agrupa múltiples productos."],
        ["Inventario", "unidad_medida → producto", "Una unidad se asigna a múltiples productos."],
        ["Inventario", "producto → movimiento", "Un producto registra múltiples movimientos históricos."],
        ["Proveedores", "proveedor → proveedor_dia_entrega", "Un proveedor puede tener horarios para cada día de la semana."],
        ["Configuración", "semanas → solicitud/pedido/pedido_semana_bodega", "Las semanas académicas rigen el ciclo operativo completo."],
        ["Solicitudes", "solicitud → detalle_solicitud", "Una solicitud contiene múltiples líneas de productos."],
        ["Pedidos", "pedido → detalle_pedido", "Un pedido contiene múltiples líneas de productos."],
    ]
))

sections.append(h2("5.3 Relaciones Muchos a Muchos (M:M)"))
sections.append(para("Las relaciones M:M se implementan mediante tablas puente que añaden metadatos propios:"))
sections.append(table(
    [("Tabla puente", 2800), ("Entidades relacionadas", 2800), ("Restricción / Propósito", 3760)],
    [
        ["docente_seccion", "usuario ↔ seccion", "UNIQUE(usuario, seccion). Actualmente 1 docente por sección (restricción de aplicación)."],
        ["asignatura_profesor_cargo", "usuario ↔ asignatura", "UNIQUE(asignatura). 1 profesor a cargo por asignatura (restricción en BD)."],
        ["proveedor_producto", "proveedor ↔ producto", "UNIQUE(proveedor, producto). Almacena precio y fecha de actualización."],
        ["pedido_solicitud", "pedido ↔ solicitud", "Permite trazabilidad de qué solicitudes integran cada pedido."],
        ["permiso_rol", "rol ↔ modulo", "UNIQUE(rol, modulo). Define la matriz CRUD de acceso por módulo."],
    ]
))
sections.append(spacer())

# SECTION 6
sections.append(h1("6. Restricciones e Integridad de Datos"))
sections.append(h2("6.1 Restricciones UNIQUE"))
sections.append(para("Las restricciones de unicidad más relevantes del sistema son:"))
sections.append(table(
    [("Tabla", 2400), ("Campo(s)", 2800), ("Propósito", 4160)],
    [
        ["usuario", "email / username", "Credenciales de acceso únicas por usuario."],
        ["producto", "nombre_producto / cod_producto", "Nombre siempre único; código opcional pero único si se ingresa."],
        ["inventario / bodega_transito", "id_producto / id_inventario", "Garantiza la relación 1:1 entre producto, inventario y bodega."],
        ["proveedor", "rut_proveedor", "Identificación legal única del proveedor."],
        ["semanas", "(nombre_semana, anio, semestre) / fecha_inicio", "Semana única por período académico."],
        ["permiso_rol", "(id_rol, id_modulo)", "Un único conjunto de permisos CRUD por par rol-módulo."],
        ["detalle_pedido / detalle_pedido_semana_bodega", "(id_pedido, id_producto)", "Un producto no se repite en el mismo pedido o plantilla."],
        ["motivo_rechazo_solicitud", "id_solicitud", "Solo un motivo de rechazo activo por solicitud."],
    ]
))

sections.append(h2("6.2 Restricciones CHECK"))
sections.append(para("Las validaciones CHECK garantizan coherencia en valores numéricos y temporales:"))
sections.append(bullet("inventario.stock y bodega_transito.stock: deben ser >= 0 (no se permite stock negativo)."))
sections.append(bullet("inventario.stock_limit y bodega_transito.stock_limit: deben ser NULL o >= 0."))
sections.append(bullet("bloque_horario y proveedor_dia_entrega: hora_inicio debe ser menor que hora_fin."))
sections.append(bullet("detalle_pedido_semana_bodega.cant_producto: debe ser >= 0."))

sections.append(h2("6.3 Borrado Lógico (Soft Delete)"))
sections.append(para("La totalidad de las entidades del sistema implementan borrado lógico mediante el campo activo (BOOLEAN, DEFAULT TRUE). Los registros nunca se eliminan físicamente, lo que preserva la trazabilidad histórica y la integridad referencial. Las excepciones son las tablas modulo y permiso_rol, que usan el campo enabled con el mismo propósito."))
sections.append(spacer())

# SECTION 7
sections.append(h1("7. Particionamiento de la Tabla movimiento"))
sections.append(para("La tabla movimiento implementa particionamiento por rango (RANGE PARTITION) sobre la columna fecha_movimiento. Esta estrategia distribuye los registros en particiones semestrales independientes, lo que mejora el rendimiento de consultas históricas y facilita el archivado de datos."))
sections.append(table(
    [("Partición", 3200), ("Rango de fechas", 2600), ("Descripción", 3560)],
    [
        ["movimiento_2026_s1", "01/01/2026 — 30/06/2026", "Primer semestre 2026"],
        ["movimiento_2026_s2", "01/07/2026 — 31/12/2026", "Segundo semestre 2026"],
        ["movimiento_2027_s1", "01/01/2027 — 30/06/2027", "Primer semestre 2027"],
        ["movimiento_2027_s2", "01/07/2027 — 31/12/2027", "Segundo semestre 2027"],
        ["movimiento_default", "Fuera de rango", "Captura fechas no cubiertas por las particiones anteriores."],
    ]
))
sections.append(para("La clave primaria de movimiento es compuesta (id_movimiento, fecha_movimiento), requisito obligatorio de PostgreSQL para tablas particionadas. La columna de partición debe formar parte de la clave primaria. Los índices sobre fecha_movimiento, tipo_movimiento, id_inventario e id_usuario optimizan las consultas operacionales más frecuentes."))
sections.append(spacer())

# SECTION 8
sections.append(h1("8. Índices"))
sections.append(para("El sistema define 49 índices B-tree orientados a optimizar las consultas más frecuentes: búsqueda de usuarios por email y nombre de usuario, historial de movimientos por producto y período, navegación de solicitudes y pedidos por estado, y resolución de claves foráneas en tablas con alto volumen de registros. A continuación se destacan los índices de mayor impacto operacional:"))
sections.append(table(
    [("Tabla", 2800), ("Índice", 3200), ("Propósito", 3360)],
    [
        ["usuario", "idx_usuario_email / idx_usuario_username", "Autenticación rápida por credenciales."],
        ["movimiento", "idx_movimiento_fecha / idx_movimiento_inventario", "Historial de stock por período y por producto."],
        ["proveedor_producto", "idx_pp_producto_precio_optimo", "Búsqueda del proveedor más económico por producto (precio ASC)."],
        ["solicitud", "idx_solicitud_estado / idx_solicitud_semana", "Filtrado operacional por estado y semana académica."],
        ["pedido", "idx_pedido_estado / idx_pedido_fecha_inicio", "Gestión de pedidos activos y por período."],
        ["inventario / bodega_transito", "idx_inventario_producto / idx_bodega_transito_inventario", "Navegación 1:1 entre producto, inventario y bodega."],
    ]
))
sections.append(spacer())

# SECTION 9
sections.append(h1("9. Funciones SQL y Triggers"))
sections.append(h2("9.1 Triggers"))
sections.append(table(
    [("Trigger", 3200), ("Tabla / Evento", 2400), ("Descripción", 3760)],
    [
        ["trg_limpiar_motivo_rechazo", "solicitud — UPDATE", "Elimina automáticamente el motivo de rechazo cuando el estado de la solicitud cambia desde RECHAZADA a cualquier otro estado."],
        ["trg_crear_inventario", "producto — INSERT", "Crea automáticamente los registros en inventario y bodega_transito al insertar un nuevo producto, garantizando la relación 1:1 desde el origen."],
    ]
))

sections.append(h2("9.2 Funciones Automáticas"))
sections.append(bullet("rechazar_solicitudes_vencidas(): ejecutada por el scheduler a las 3:00 AM diariamente. Cambia a RECHAZADA toda solicitud con estado PENDIENTE cuya fecha_solicitada sea anterior a la fecha actual, insertando el motivo automático \"Solicitud vencida (fecha pasada)\"."))
sections.append(bullet("El campo anio de la tabla semanas es una columna generada (GENERATED ALWAYS AS EXTRACT(YEAR FROM fecha_inicio)), calculada automáticamente por PostgreSQL sin intervención de la aplicación."))
sections.append(spacer())

# SECTION 10
sections.append(h1("10. Tipos ENUM del Sistema"))
sections.append(para("PostgreSQL gestiona los estados de negocio mediante tipos ENUM que garantizan integridad a nivel de base de datos, evitando valores no contemplados:"))
sections.append(table(
    [("Tipo ENUM", 3200), ("Valores", 6160)],
    [
        ["estado_solicitud_type", "PENDIENTE, ACEPTADA, EN_PEDIDO, PROCESADO, RECHAZADA"],
        ["estado_pedido_type", "PENDIENTE, APROBADO, EN_PREPARACION, ENTREGADO, CANCELADO"],
        ["estado_pedido_semana_bodega_type", "ACTIVO, INACTIVO"],
        ["nombre_rol_type", "ADMINISTRADOR, CO_ADMINISTRADOR, GESTOR_PEDIDOS, PROFESOR_A_CARGO, DOCENTE, ENCARGADO_BODEGA, ASISTENTE_BODEGA"],
        ["dia_semana_type", "LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO"],
        ["estado_seccion_type", "ACTIVA, INACTIVA, SUSPENDIDA"],
        ["tipo_movimiento_type", "ENTRADA, SALIDA, TRANSFERENCIA, AJUSTE"],
    ]
))
sections.append(spacer())

# SECTION 11
sections.append(h1("11. Módulo de Configuración"))
sections.append(h2("11.1 Tabla gestion_sistema"))
sections.append(para("Tabla de configuración global del sistema con exactamente 2 filas (una por semestre activo). Almacena parámetros operativos como el indicador solicitudes_en_pedido (BOOLEAN), que controla si las solicitudes aprobadas deben transitar por el estado EN_PEDIDO antes de procesarse. Es consultada frecuentemente por los servicios de negocio para determinar el comportamiento del flujo de trabajo."))

sections.append(h2("11.2 Tabla semanas"))
sections.append(para("Define los 18 períodos semanales por semestre académico. Sus campos principales son nombre_semana, fecha_inicio (UNIQUE), fecha_fin, semestre (SMALLINT) y anio (columna generada). Toda solicitud, pedido y pedido semanal a bodega debe estar asociado a una semana activa, siendo esta tabla el eje temporal del sistema."))
sections.append(spacer())

# SECTION 12
sections.append(h1("12. Módulo de Pedido Semanal a Bodega"))
sections.append(h2("12.1 Tabla pedido_semana_bodega"))
sections.append(para("Representa las plantillas de insumos que bodega debe preparar semanalmente. Antiguamente denominada \"receta\". Sus FKs a id_semana e id_asignatura son NULLABLE para que la plantilla persista aunque se elimine la semana o asignatura asociada. El estado se controla con el ENUM estado_pedido_semana_bodega_type (ACTIVO/INACTIVO)."))

sections.append(h2("12.2 Tabla detalle_pedido_semana_bodega"))
sections.append(para("Contiene el desglose de productos de cada plantilla. La relación con pedido_semana_bodega es CascadeType.ALL con orphanRemoval=true: al eliminar la plantilla, sus detalles se eliminan en cascada. La cantidad (cant_producto, NUMERIC 10,3) admite fracciones."))

sections.append(h2("12.3 Cálculo de Cantidades y Reglas de Redondeo"))
sections.append(para("Las plantillas se definen para una base de 20 personas. Al generar una solicitud, el sistema aplica un multiplicador proporcional a los inscritos reales de la sección:"))
sections.append(bullet("Multiplicador = cantidad_inscritos / 20."))
sections.append(bullet("Productos fraccionables (es_fraccionario = TRUE, ej.: kg, litros): se conservan hasta 3 decimales."))
sections.append(bullet("Productos indivisibles (es_fraccionario = FALSE, ej.: unidades, cajas): se aplica redondeo hacia arriba (CEIL) para evitar déficit."))
sections.append(bullet("Productos con activo = FALSE se excluyen automáticamente del cálculo."))
sections.append(spacer())

# SECTION 13
sections.append(h1("13. Módulo de Solicitudes"))
sections.append(h2("13.1 Tabla solicitud"))
sections.append(para("Cabecera de cada solicitud de insumos. Sus campos principales son: id_usuario_gestor_solicitud (FK → usuario), id_seccion (FK → seccion), id_pedido_semana_bodega (NULLABLE), id_reserva_sala (NULLABLE), fecha_solicitada (DATE), fecha_registro (TIMESTAMP), observaciones (TEXT) y estado_solicitud (ENUM, DEFAULT PENDIENTE)."))

sections.append(h2("13.2 Ciclo de Vida de una Solicitud"))
sections.append(table(
    [("Estado", 2000), ("Significado", 7360)],
    [
        ["PENDIENTE", "Recién creada, pendiente de revisión por parte del gestor."],
        ["ACEPTADA", "Aprobada por el gestor; lista para ser incorporada a un pedido."],
        ["EN_PEDIDO", "Incluida en un pedido consolidado (solo si gestion_sistema.solicitudes_en_pedido = TRUE)."],
        ["PROCESADO", "Entregada físicamente; flujo completado."],
        ["RECHAZADA", "Rechazada. Requiere registro en motivo_rechazo_solicitud."],
    ]
))

sections.append(h2("13.3 Tabla motivo_rechazo_solicitud"))
sections.append(para("Registra el motivo textual de rechazo. La restricción UNIQUE(id_solicitud) garantiza máximo un motivo activo por solicitud. El trigger trg_limpiar_motivo_rechazo elimina este registro automáticamente si la solicitud se reactiva. El scheduler nocturno rechaza con motivo automático todas las solicitudes PENDIENTE cuya fecha_solicitada haya pasado."))
sections.append(spacer())

# SECTION 14
sections.append(h1("14. Módulo de Pedidos"))
sections.append(h2("14.1 Tabla pedido"))
sections.append(para("Cabecera del pedido consolidado. Contiene fecha_inicio_pedido, fecha_fin_pedido, fecha_registro y estado_pedido (ENUM: PENDIENTE, APROBADO, ENTREGADO, RECHAZADO). Un pedido agrupa múltiples solicitudes y los productos correspondientes."))

sections.append(h2("14.2 Tabla detalle_pedido"))
sections.append(para("Líneas de producto de cada pedido. La restricción UNIQUE(id_pedido, id_producto) impide que un mismo producto aparezca dos veces en el mismo pedido. La cantidad se almacena como NUMERIC(10,3)."))

sections.append(h2("14.3 Tabla pedido_solicitud"))
sections.append(para("Tabla puente M:M que vincula pedidos con las solicitudes que los componen. Almacena la fecha de incorporación (fecha_union_registro) y aplica UNIQUE(id_pedido, id_solicitud) para evitar duplicados. Su propósito principal es la trazabilidad: permite saber con exactitud qué solicitudes de qué docentes componen cada pedido consolidado."))
sections.append(spacer())

# SECTION 15
sections.append(h1("15. Notas de Arquitectura"))
sections.append(h2("15.1 Tabla docente_seccion — Diseño M:M Escalable"))
sections.append(para("Aunque la lógica de negocio actual restringe la asignación a un solo docente por sección, la tabla se diseñó como M:M para facilitar la incorporación futura de co-docencia sin cambios de esquema. La restricción opera a nivel de servicio (SeccionServiceImp), no en la base de datos, de modo que habilitarla solo requiere ajustar la capa de aplicación."))

sections.append(h2("15.2 Tabla asignatura_profesor_cargo — M:M con Restricción en BD"))
sections.append(para("Similar a docente_seccion, pero la restricción de un único profesor a cargo se refuerza con UNIQUE(id_asignatura) directamente en la base de datos, dado que el rol de profesor a cargo es más crítico que el de docente de sección. Para habilitar múltiples profesores a cargo bastaría remover dicha restricción."))

sections.append(h2("15.3 Campo stock_limit — Semántica Diferente por Módulo"))
sections.append(para("El campo stock_limit tiene significados distintos según la tabla en que aparece:"))
sections.append(bullet("inventario.stock_limit: umbral mínimo de alerta. Si stock < stock_limit, el sistema notifica que el producto necesita reposición."))
sections.append(bullet("bodega_transito.stock_limit: límite físico máximo de espacio disponible en la bodega de tránsito. Si stock > stock_limit, no hay capacidad de recepción."))
sections.append(para("Ambos campos son NULLABLE (sin restricción configurada) y aplican la misma validación CHECK (>= 0 si no es NULL)."))

sections.append(h2("15.4 Tabla usuario — Campos de Seguridad y Auditoría"))
sections.append(bullet("contrasena VARCHAR(60): dimensionado para almacenar hashes Bcrypt completos (formato de 60 caracteres). Reducirlo comprometería la seguridad."))
sections.append(bullet("url_foto_perfil BYTEA: almacena la imagen de perfil como blob. Está planificada su migración a VARCHAR con URL de servicio externo (S3 o similar)."))
sections.append(bullet("fecha_creacion TIMESTAMP: registro automático e inmutable de cuándo se creó el usuario (auditoría)."))
sections.append(bullet("ultimo_acceso TIMESTAMP (NULLABLE): se actualiza en cada login exitoso. Valor NULL indica usuario creado pero que nunca ha iniciado sesión."))
sections.append(bullet("activo BOOLEAN (Soft Delete): al desactivar un usuario, sus refresh_token asociados se invalidan en cascada."))

sections.append(h2("15.5 Tabla refresh_token — Gestión JWT"))
sections.append(para("Almacena los tokens de renovación de sesión JWT. El campo expires_at (TIMESTAMP con precisión de microsegundos) controla la expiración. El campo activo permite revocación lógica sin eliminar el registro. La FK a usuario tiene ON DELETE CASCADE, eliminando todos los tokens si el usuario es borrado físicamente."))

sections.append(h2("15.6 Tabla proveedor_producto — Tabla Puente con Precio"))
sections.append(para("Además de vincular proveedores con productos, almacena el precio_producto (NUMERIC 12,2) y la fecha_actualizacion para comparativa de costos. La restricción UNIQUE(id_proveedor, id_producto) garantiza una sola cotización por par. El índice idx_pp_producto_precio_optimo (precio ASC) optimiza la búsqueda del proveedor más económico por producto."))

sections.append(h2("15.7 Tabla lote — Funcionalidad Futura (FIFO/FEFO)"))
sections.append(para("Existe en la base de datos una tabla lote diseñada para el rastreo de lotes con soporte FIFO (First In First Out) y FEFO (First Expired First Out). Incluye numero_lote, ubicacion, cantidad_producto, fecha_fabricacion y fecha_caducidad. La estructura está lista, pero los endpoints del backend y las pantallas del frontend aún no han sido implementados. Su activación habilitará alertas automáticas de caducidad y consumo priorizado por antigüedad."))
sections.append(spacer())

# SECTION 16
sections.append(h1("16. Sistema de Permisos"))
sections.append(h2("16.1 Tabla modulo"))
sections.append(para("Registra los 17 módulos funcionales del sistema con su código único (codigo_modulo), nombre, descripción, icono, orden de visualización y estado (enabled). El backend Hibernate gestiona su creación inicial."))

sections.append(h2("16.2 Tabla permiso_rol — Matriz CRUD"))
sections.append(para("Define la matriz de control de acceso por rol y módulo. Cada fila contiene los flags puede_leer, puede_crear, puede_actualizar y puede_eliminar para un par único (id_rol, id_modulo). Es la tabla central del sistema RBAC (Role-Based Access Control)."))

sections.append(h2("16.3 Roles del Sistema"))
sections.append(table(
    [("Rol", 2800), ("Módulos con acceso", 6560)],
    [
        ["ADMINISTRADOR", "Todos los módulos del sistema."],
        ["CO_ADMINISTRADOR", "Todos excepto GESTION_ROLES y ADMIN_SISTEMA."],
        ["GESTOR_PEDIDOS", "DASHBOARD, GESTION_PEDIDOS, GESTION_SOLICITUDES, CONGLOMERADO_PEDIDOS."],
        ["PROFESOR_A_CARGO", "DASHBOARD, SOLICITUD, GESTION_RECETAS."],
        ["DOCENTE", "DASHBOARD, SOLICITUD, GESTION_RECETAS (solo lectura)."],
        ["ENCARGADO_BODEGA", "DASHBOARD, INVENTARIO, BODEGA_TRANSITO, GESTION_PEDIDOS_DIARIOS."],
        ["ASISTENTE_BODEGA", "DASHBOARD, BODEGA_TRANSITO, GESTION_PEDIDOS_DIARIOS."],
    ]
))
sections.append(spacer())

xml_content = "\n".join(sections)
import os
output_path = os.path.join(os.path.dirname(__file__), "new_sections_utf8.xml")
with open(output_path, "w", encoding="utf-8-sig") as f:
    f.write(xml_content)

print("Generated XML length:", len(xml_content))
print("Output file:", output_path)
print("Done")
