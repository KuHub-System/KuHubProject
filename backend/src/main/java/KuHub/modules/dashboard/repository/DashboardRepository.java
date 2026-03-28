package KuHub.modules.dashboard.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public class DashboardRepository {

    @PersistenceContext
    private EntityManager em;

    // ── ADMIN ──────────────────────────────────────────────────────────────────

    public long countSolicitudesToday() {
        return ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM solicitud WHERE DATE(fecha_solicitada) = CURRENT_DATE"
        ).getSingleResult()).longValue();
    }

    public long countSolicitudesWeek() {
        return ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM solicitud WHERE fecha_solicitada >= date_trunc('week', CURRENT_DATE)"
        ).getSingleResult()).longValue();
    }

    public long countSolicitudesMonth() {
        return ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM solicitud WHERE fecha_solicitada >= date_trunc('month', CURRENT_DATE)"
        ).getSingleResult()).longValue();
    }

    public long countTotalPedidos() {
        return ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM pedido"
        ).getSingleResult()).longValue();
    }

    public long countProductosBajoStock() {
        return ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM inventario WHERE stock < stock_limit AND stock_limit IS NOT NULL AND activo = true"
        ).getSingleResult()).longValue();
    }

    public long countUsuariosActivos() {
        return ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM usuario WHERE activo = true"
        ).getSingleResult()).longValue();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getSolicitudesPorEstado() {
        return em.createNativeQuery(
            "SELECT estado_solicitud::text, COUNT(*) FROM solicitud GROUP BY estado_solicitud"
        ).getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getSolicitudesPorDia() {
        return em.createNativeQuery(
            "SELECT TO_CHAR(fecha_solicitada, 'DD/MM') AS fecha, COUNT(*) AS total " +
            "FROM solicitud " +
            "WHERE fecha_solicitada >= CURRENT_DATE - INTERVAL '30 days' " +
            "GROUP BY fecha_solicitada, TO_CHAR(fecha_solicitada, 'DD/MM') " +
            "ORDER BY fecha_solicitada"
        ).getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getPedidosPorSemana() {
        return em.createNativeQuery(
            "SELECT s.nombre_semana, COUNT(p.id_pedido) AS total " +
            "FROM semanas s " +
            "LEFT JOIN pedido p ON p.fecha_inicio_pedido >= s.fecha_inicio AND p.fecha_fin_pedido <= s.fecha_fin " +
            "WHERE s.anio = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER " +
            "GROUP BY s.id_semana, s.nombre_semana, s.fecha_inicio " +
            "ORDER BY s.fecha_inicio DESC " +
            "LIMIT 8"
        ).getResultList();
    }

    // ── INVENTARIO ─────────────────────────────────────────────────────────────

    public Object[] getInventarioKpis() {
        return (Object[]) em.createNativeQuery(
            "SELECT COUNT(*), COALESCE(SUM(stock), 0), " +
            "COUNT(*) FILTER (WHERE stock < stock_limit AND stock_limit IS NOT NULL) " +
            "FROM inventario WHERE activo = true"
        ).getSingleResult();
    }

    public long countMovimientosHoy() {
        return ((Number) em.createNativeQuery(
            "SELECT COUNT(*) FROM movimiento WHERE DATE(fecha_movimiento) = CURRENT_DATE"
        ).getSingleResult()).longValue();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getProductosCriticos() {
        return em.createNativeQuery(
            "SELECT p.nombre_producto, i.stock, i.stock_limit, c.nombre_categoria, u.nombre_unidad " +
            "FROM inventario i " +
            "JOIN producto p ON p.id_producto = i.id_producto " +
            "JOIN categoria c ON c.id_categoria = p.id_categoria " +
            "JOIN unidad_medida u ON u.id_unidad = p.id_unidad " +
            "WHERE i.stock < i.stock_limit AND i.stock_limit IS NOT NULL AND i.activo = true " +
            "ORDER BY (i.stock / NULLIF(i.stock_limit, 0)) ASC " +
            "LIMIT 10"
        ).getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getStockPorCategoria() {
        return em.createNativeQuery(
            "SELECT c.nombre_categoria, COALESCE(SUM(i.stock), 0) AS total " +
            "FROM inventario i " +
            "JOIN producto p ON p.id_producto = i.id_producto " +
            "JOIN categoria c ON c.id_categoria = p.id_categoria " +
            "WHERE i.activo = true " +
            "GROUP BY c.id_categoria, c.nombre_categoria " +
            "ORDER BY total DESC"
        ).getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getMovimientosPorDia() {
        return em.createNativeQuery(
            "SELECT TO_CHAR(DATE(fecha_movimiento), 'DD/MM') AS fecha, COUNT(*) AS total " +
            "FROM movimiento " +
            "WHERE fecha_movimiento >= CURRENT_DATE - INTERVAL '14 days' " +
            "GROUP BY DATE(fecha_movimiento), TO_CHAR(DATE(fecha_movimiento), 'DD/MM') " +
            "ORDER BY DATE(fecha_movimiento)"
        ).getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getTopProductosUsados() {
        return em.createNativeQuery(
            "SELECT p.nombre_producto, SUM(m.stock_movimiento) AS total " +
            "FROM movimiento m " +
            "JOIN inventario i ON i.id_inventario = m.id_inventario " +
            "JOIN producto p ON p.id_producto = i.id_producto " +
            "WHERE m.tipo_movimiento IN ('SALIDA_INVENTARIO', 'SALIDA_BODEGA') " +
            "AND m.fecha_movimiento >= CURRENT_DATE - INTERVAL '30 days' " +
            "GROUP BY p.id_producto, p.nombre_producto " +
            "ORDER BY total DESC LIMIT 5"
        ).getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getTopProductosMerma() {
        return em.createNativeQuery(
            "SELECT p.nombre_producto, SUM(m.stock_movimiento) AS total " +
            "FROM movimiento m " +
            "JOIN inventario i ON i.id_inventario = m.id_inventario " +
            "JOIN producto p ON p.id_producto = i.id_producto " +
            "WHERE m.tipo_movimiento IN ('MERMA_INVENTARIO', 'MERMA_BODEGA') " +
            "AND m.fecha_movimiento >= CURRENT_DATE - INTERVAL '30 days' " +
            "GROUP BY p.id_producto, p.nombre_producto " +
            "ORDER BY total DESC LIMIT 5"
        ).getResultList();
    }

    // ── GESTOR ─────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<Object[]> getSolicitudesPorAsignatura() {
        return em.createNativeQuery(
            "SELECT a.nombre_asignatura, COUNT(s.id_solicitud) AS total " +
            "FROM solicitud s " +
            "JOIN seccion sec ON sec.id_seccion = s.id_seccion " +
            "JOIN asignatura a ON a.id_asignatura = sec.id_asignatura " +
            "GROUP BY a.id_asignatura, a.nombre_asignatura " +
            "ORDER BY total DESC LIMIT 10"
        ).getResultList();
    }

    public double getTiempoPromedioHoras() {
        Object result = em.createNativeQuery(
            "SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (fecha_registro - fecha_solicitada::timestamp)) / 3600.0), 0) " +
            "FROM solicitud WHERE estado_solicitud IN ('ACEPTADA', 'PROCESADO')"
        ).getSingleResult();
        return result == null ? 0.0 : ((Number) result).doubleValue();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getSolicitudesRechazadas() {
        return em.createNativeQuery(
            "SELECT s.id_solicitud, COALESCE(mr.motivo, 'Sin motivo registrado'), " +
            "TO_CHAR(s.fecha_solicitada, 'DD/MM/YYYY') " +
            "FROM solicitud s " +
            "LEFT JOIN motivo_rechazo_solicitud mr ON mr.id_solicitud = s.id_solicitud " +
            "WHERE s.estado_solicitud = 'RECHAZADA' " +
            "ORDER BY s.fecha_solicitada DESC LIMIT 10"
        ).getResultList();
    }

    // ── RECETAS ────────────────────────────────────────────────────────────────

    public Object[] getRecetasKpis() {
        return (Object[]) em.createNativeQuery(
            "SELECT " +
            "COUNT(*) FILTER (WHERE estado_receta = 'ACTIVO'), " +
            "COUNT(*) FILTER (WHERE estado_receta = 'INACTIVO'), " +
            "COUNT(*) " +
            "FROM receta"
        ).getSingleResult();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getTopIngredientes() {
        return em.createNativeQuery(
            "SELECT p.nombre_producto, SUM(dr.cant_producto) AS uso_total " +
            "FROM detalle_receta dr " +
            "JOIN producto p ON p.id_producto = dr.id_producto " +
            "JOIN receta r ON r.id_receta = dr.id_receta " +
            "WHERE r.estado_receta = 'ACTIVO' " +
            "GROUP BY p.id_producto, p.nombre_producto " +
            "ORDER BY uso_total DESC LIMIT 10"
        ).getResultList();
    }
}
