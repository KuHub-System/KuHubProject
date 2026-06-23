import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chip } from '@heroui/react';
import { Icon } from '@iconify/react';
import logoDuoc from '../components/assets/Logo_DuocUC.webp';

type Direction = 1 | -1;

const slideVariants = {
  enter: (dir: Direction) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
  exit:   (dir: Direction) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }),
};

// ─── Slide 1: Portada ─────────────────────────────────────────────────────────

const integrantes = [
  { nombre: 'Matheus de Lara',  rol: 'Fullstack · Arquitectura · Infraestructura' },
  { nombre: 'Francisco Gomes',  rol: 'Backend · Base de datos · Cliente' },
  { nombre: 'Benjamin Aravena', rol: 'Frontend · UX · Diseño' },
];

const SlidePortada: React.FC = () => (
  <div className="flex h-full bg-[#1A1A1A] text-white relative overflow-hidden">
    {/* Fondo decorativo */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FFB800]/8 rounded-full translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#FFB800]/4 rounded-full -translate-x-1/3 translate-y-1/3" />
    </div>

    {/* Columna izquierda: contenido principal */}
    <motion.div
      className="relative z-10 flex flex-col justify-center flex-1 px-16 gap-8"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      {/* Logo DuocUC */}
      <img src={logoDuoc} alt="DuocUC" className="h-14 w-auto object-contain self-start" />

      {/* Título */}
      <div>
        <h1 className="text-8xl font-black tracking-tight text-[#FFB800] leading-none">KuHub</h1>
        <p className="mt-4 text-2xl font-light text-white/70 leading-snug">
          Sistema de Gestión de<br />Bodega e Inventario
        </p>
      </div>

      {/* Separador */}
      <div className="w-20 h-1.5 bg-[#FFB800] rounded-full" />

      {/* Badges */}
      <div className="flex flex-col gap-2">
        <span className="text-white/40 text-base">Escuela de Gastronomía · DuocUC</span>
        <span className="text-white/30 text-sm">Taller de Proyecto · v1.0.8 · 2026</span>
      </div>
    </motion.div>

    {/* Divisor vertical */}
    <div className="relative z-10 w-px bg-white/10 my-16" />

    {/* Columna derecha: integrantes */}
    <motion.div
      className="relative z-10 flex flex-col justify-center w-[380px] px-12 gap-6"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.25 }}
    >
      <div className="mb-2">
        <p className="text-xs text-white/30 uppercase font-bold tracking-widest mb-1">Equipo de desarrollo</p>
        <div className="w-8 h-0.5 bg-[#FFB800]" />
      </div>

      {integrantes.map((p, i) => (
        <motion.div
          key={p.nombre}
          className="flex items-start gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + 0.15 * i }}
        >
          <div className="w-10 h-10 rounded-full bg-[#FFB800]/15 border border-[#FFB800]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon icon="lucide:user" width={18} color="#FFB800" />
          </div>
          <div>
            <p className="text-base font-bold text-white">{p.nombre}</p>
            <p className="text-sm text-white/40 mt-0.5">{p.rol}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  </div>
);

// ─── Slide 2: Problema ────────────────────────────────────────────────────────

const problemas = [
  {
    icon: 'lucide:table-2',
    titulo: 'Inventario en columnas de Excel',
    desc: 'Cada movimiento exigía agregar una columna manual con fecha y motivo, sin historial estructurado.',
    tag: 'Inventario',
    color: '#EF4444',
  },
  {
    icon: 'lucide:package-minus',
    titulo: 'Sin control de sobrantes ni mermas',
    desc: 'Los productos que sobraban por ausencia de alumnos no tenían registro formal. El stock real era desconocido.',
    tag: 'Stock real',
    color: '#F59E0B',
  },
  {
    icon: 'lucide:calendar-x',
    titulo: 'Pedidos limitados a 2 semanas',
    desc: 'La dificultad de consolidar datos hacía imposible planificar más de 2 semanas, con chequeos constantes.',
    tag: 'Proveedores',
    color: '#8B5CF6',
  },
  {
    icon: 'lucide:files',
    titulo: 'Múltiples Excel desconectados',
    desc: 'Cada área tenía sus propios archivos. Entender el contexto completo exigía revisar varios Excel a la vez.',
    tag: 'Trazabilidad',
    color: '#3B82F6',
  },
  {
    icon: 'lucide:scan-eye',
    titulo: 'Verificación física constante',
    desc: 'Sin confianza en los registros digitales, el personal debía contrastar Excel con el stock físico permanentemente.',
    tag: 'Operaciones',
    color: '#10B981',
  },
];

const SlideProblema: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-white px-12 py-8">
    <motion.div className="w-full max-w-5xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-8 text-center">
        <Chip className="mb-3 bg-[#FFB800]/20 text-[#1A1A1A] text-sm" size="md">Problemática</Chip>
        <h2 className="text-5xl font-bold text-[#1A1A1A]">¿Por qué se desarrolló KuHub?</h2>
        <p className="mt-3 text-xl text-gray-500">
          Gestión con múltiples hojas de cálculo Excel desconectadas entre sí
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {problemas.slice(0, 3).map((p, i) => (
          <motion.div key={p.titulo} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 * (i + 1) }}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${p.color}15` }}>
                <Icon icon={p.icon} width={26} color={p.color} />
              </div>
              <span className="text-sm font-bold rounded-full px-3 py-1" style={{ backgroundColor: `${p.color}12`, color: p.color }}>{p.tag}</span>
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A] leading-snug">{p.titulo}</p>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 max-w-[68%] mx-auto">
        {problemas.slice(3).map((p, i) => (
          <motion.div key={p.titulo} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 * (i + 4) }}
            className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${p.color}15` }}>
                <Icon icon={p.icon} width={26} color={p.color} />
              </div>
              <span className="text-sm font-bold rounded-full px-3 py-1" style={{ backgroundColor: `${p.color}12`, color: p.color }}>{p.tag}</span>
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A] leading-snug">{p.titulo}</p>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

// ─── Slide 3: ¿Por qué KuHub? ────────────────────────────────────────────────

const diferenciadores = [
  { icon: 'lucide:ruler',        titulo: 'Solución a medida',           desc: 'Construido desde cero para los procesos reales de la institución, no adaptado de un sistema genérico.',           color: '#FFB800' },
  { icon: 'lucide:activity',     titulo: 'Trazabilidad completa',        desc: 'Cada movimiento registra usuario, fecha y motivo. Historial semestral y anual siempre disponible.',              color: '#10B981' },
  { icon: 'lucide:file-down',    titulo: 'Informes para proveedores',    desc: 'Excel automático con productos por día de entrega y la mejor cotización disponible por proveedor.',             color: '#3B82F6' },
  { icon: 'lucide:shield-check', titulo: 'Roles dinámicos',              desc: 'Permisos configurables módulo a módulo sin modificar código. Se adapta a cambios organizacionales.',             color: '#8B5CF6' },
  { icon: 'lucide:trending-up',  titulo: 'Optimización de recursos',     desc: 'Visión unificada de inventario, solicitudes y pedidos. Menos tiempo en planificación, más en gestión.',          color: '#FF585D' },
  { icon: 'lucide:x-circle',     titulo: 'Lo que Excel no puede dar',    desc: 'Aprobaciones, validaciones en tiempo real e historial estructurado accesible por múltiples usuarios a la vez.',  color: '#F59E0B' },
];

const SlidePorQueKuHub: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-[#1A1A1A] px-12 py-8">
    <motion.div className="w-full max-w-5xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-8 text-center">
        <Chip className="mb-3 bg-[#FFB800]/20 text-[#FFB800] text-sm" size="md">Propuesta de valor</Chip>
        <h2 className="text-5xl font-bold text-white">¿Por qué KuHub y no otro sistema?</h2>
        <p className="mt-3 text-xl text-white/50">Un traje a medida para necesidades reales que otros software no atienden</p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {diferenciadores.map((d, i) => (
          <motion.div key={d.titulo} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 * (i + 1) }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${d.color}20` }}>
              <Icon icon={d.icon} width={26} color={d.color} />
            </div>
            <div>
              <p className="text-lg font-bold text-white leading-snug">{d.titulo}</p>
              <p className="mt-2 text-sm text-white/50 leading-relaxed">{d.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

    </motion.div>
  </div>
);

// ─── Slide 4: Pruebas automatizadas ──────────────────────────────────────────

const suitesPruebas = [
  { suite: 'Login',                area: 'Página',   tests: 20, color: '#3B82F6' },
  { suite: 'Refresh Token',        area: 'Servicio', tests: 18, color: '#10B981' },
  { suite: 'Conglomerado Pedidos', area: 'Página',   tests: 17, color: '#AC4FC6' },
  { suite: 'Pedido a Bodega',      area: 'Página',   tests: 14, color: '#FFB800' },
  { suite: 'Inventario',           area: 'Página',   tests: 13, color: '#43B02A' },
  { suite: 'Solicitudes',          area: 'Página',   tests: 12, color: '#FF585D' },
  { suite: 'Gestión Académica',    area: 'Página',   tests: 10, color: '#5BC2E7' },
  { suite: 'Bodega Tránsito',      area: 'Página',   tests: 10, color: '#F59E0B' },
  { suite: 'Movimientos',          area: 'Página',   tests:  6, color: '#6366F1' },
  { suite: 'Abastecimiento',       area: 'Servicio', tests:  5, color: '#EF4444' },
];

const SlidePruebas: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-[#1A1A1A] px-12 py-8">
    <motion.div className="w-full max-w-5xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

      <div className="mb-6 text-center">
        <Chip className="mb-3 bg-[#10B981]/20 text-[#10B981] text-sm" size="md">Calidad del software</Chip>
        <h2 className="text-5xl font-bold text-white">Pruebas Automatizadas</h2>
        <p className="mt-2 text-xl text-white/40">Vitest + React Testing Library · Patrón AAA · 125 tests</p>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 280px' }}>

        {/* Suites — 2 columnas internas */}
        <div className="grid grid-cols-2 gap-2.5 content-start">
          {suitesPruebas.map((s, i) => (
            <motion.div key={s.suite}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{s.suite}</p>
                <p className="text-xs text-white/40">{s.area} · {s.tests} tests</p>
              </div>
              <span className="text-xs font-bold text-[#10B981] bg-[#10B981]/15 rounded-full px-2 py-0.5 flex-shrink-0">PASS</span>
            </motion.div>
          ))}
        </div>

        {/* Panel derecho */}
        <div className="flex flex-col gap-4">

          {/* Herramientas */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-3">Herramientas</p>
            {[
              { icon: 'lucide:flask-conical',       label: 'Vitest',                  color: '#FFB800' },
              { icon: 'lucide:test-tube-diagonal',  label: 'React Testing Library',   color: '#FF585D' },
              { icon: 'lucide:mouse-pointer-click', label: 'userEvent',               color: '#5BC2E7' },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                <Icon icon={t.icon} width={18} color={t.color} />
                <span className="text-sm text-white/70">{t.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Metodología AAA */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-3">Metodología</p>
            {[
              { step: 'Arrange', desc: 'Preparar contexto y mocks', color: '#3B82F6' },
              { step: 'Act',     desc: 'Ejecutar la acción',         color: '#FFB800' },
              { step: 'Assert',  desc: 'Verificar el resultado',     color: '#10B981' },
            ].map((m) => (
              <div key={m.step} className="flex items-center gap-2.5 py-2.5 border-b border-white/5 last:border-0">
                <span className="text-xs font-black w-14 flex-shrink-0" style={{ color: m.color }}>{m.step}</span>
                <span className="text-xs text-white/55">{m.desc}</span>
              </div>
            ))}
          </motion.div>

          {/* Datos de prueba */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-3">Datos de prueba</p>
            <div className="text-xs font-mono space-y-1.5">
              <p><span className="text-[#3B82F6] font-bold">email</span><span className="text-white/40"> admin@duoc.cl</span></p>
              <p><span className="text-[#3B82F6] font-bold">pass</span><span className="text-white/40">  admin123</span></p>
              <p><span className="text-[#43B02A] font-bold">prod</span><span className="text-white/40">  Arroz Premium · stock 100</span></p>
              <p><span className="text-[#EF4444] font-bold">edge</span><span className="text-white/40">  Harina de Trigo · stock 0</span></p>
            </div>
          </motion.div>

        </div>
      </div>

    </motion.div>
  </div>
);

// ─── Slide 5: Mejoras realizadas ─────────────────────────────────────────────

const mejoras = [
  {
    id: 'TC-LOGIN-14',
    hallazgo: 'Formulario activo durante petición de login',
    mejora: 'Estado isLoading deshabilita email, contraseña y botón submit durante la petición',
    evidencia: 'Campos deshabilitados · retest PASS',
    color: '#3B82F6',
  },
  {
    id: 'TC-LOGIN-17',
    hallazgo: 'Mensaje de error persistía al reintentar inicio de sesión',
    mejora: 'Limpieza del estado de error al iniciar cada nuevo submit del formulario',
    evidencia: 'Mensaje ausente en 2.° intento · retest PASS',
    color: '#F59E0B',
  },
  {
    id: 'BIM-03',
    hallazgo: 'Tabla de movimientos sin estado vacío definido',
    mejora: 'Agregado texto "No se encontraron movimientos" al renderizar lista vacía',
    evidencia: 'Empty state en DOM · retest PASS',
    color: '#10B981',
  },
  {
    id: 'BIM-06',
    hallazgo: 'Tipo de movimiento exponía código enum interno al usuario',
    mejora: 'Función renderTipoMovimiento mapea enum → etiqueta legible en español',
    evidencia: 'Labels en negrita correctos en tabla · retest PASS',
    color: '#AC4FC6',
  },
  {
    id: 'INV-11',
    hallazgo: 'Inventario no se recuperaba tras error de red',
    mejora: 'Listener global "productosActualizados" fuerza recarga tras fallo de servicio',
    evidencia: 'Servicio invocado 2 veces · retest PASS',
    color: '#FF585D',
  },
  {
    id: 'BIM-07',
    hallazgo: 'cargarFiltros de bodega se recreaba en cada render',
    mejora: 'useCallback con dependencias explícitas estabiliza la función entre renders',
    evidencia: 'toHaveBeenCalled sin renders extra · retest PASS',
    color: '#FFB800',
  },
];

const estandares = [
  { label: 'ISO/IEC 25010', desc: 'Fiabilidad · Adecuación funcional' },
  { label: 'ISTQB',         desc: 'Regresión · Diseño de casos' },
  { label: 'Patrón AAA',    desc: 'Arrange · Act · Assert' },
  { label: 'CI-ready',      desc: 'Vitest · Mock · Spy' },
];

const SlideMejoras: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-white px-12 py-8">
    <motion.div className="w-full max-w-5xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

      <div className="mb-6 text-center">
        <Chip className="mb-3 bg-[#FFB800]/20 text-[#1A1A1A] text-sm" size="md">Ciclo de mejora continua</Chip>
        <h2 className="text-5xl font-bold text-[#1A1A1A]">Mejoras Realizadas</h2>
        <p className="mt-2 text-xl text-gray-500">Prueba → Hallazgo → Mejora implementada · Evidencia verificada en retest</p>
      </div>

      {/* Encabezado de tabla */}
      <div className="grid gap-x-5 mb-2 px-5 py-2" style={{ gridTemplateColumns: '120px 1fr 1.2fr 210px' }}>
        {['Prueba', 'Hallazgo detectado', 'Mejora implementada', 'Evidencia'].map((h) => (
          <span key={h} className="text-sm text-gray-400 uppercase font-bold tracking-wider">{h}</span>
        ))}
      </div>

      {/* Filas */}
      <div className="flex flex-col gap-2">
        {mejoras.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 * i }}
            className="grid gap-x-5 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 items-center"
            style={{ gridTemplateColumns: '120px 1fr 1.2fr 210px' }}
          >
            <span className="text-sm font-black font-mono" style={{ color: m.color }}>{m.id}</span>
            <span className="text-sm text-gray-500 leading-snug">{m.hallazgo}</span>
            <span className="text-sm text-[#1A1A1A] leading-snug">{m.mejora}</span>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:check-circle-2" width={16} color="#10B981" className="flex-shrink-0" />
              <span className="text-sm text-[#10B981] leading-snug">{m.evidencia}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Estándares de calidad */}
      <motion.div className="mt-6 flex items-center gap-3 flex-wrap justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <span className="text-sm text-gray-400 uppercase tracking-widest font-bold">Estándares</span>
        {estandares.map((e) => (
          <div key={e.label} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-5 py-2">
            <span className="text-sm font-bold text-[#B8860B]">{e.label}</span>
            <span className="text-sm text-gray-300">·</span>
            <span className="text-sm text-gray-500">{e.desc}</span>
          </div>
        ))}
      </motion.div>

    </motion.div>
  </div>
);

// ─── Slide 6: La Solución — Beneficios vs Problemas ──────────────────────────

const beneficios = [
  {
    problema: 'Inventario manejado en columnas de Excel sin historial estructurado',
    beneficio: 'Stock en tiempo real con historial de movimientos: quién, cuándo y por qué',
    iconProb: 'lucide:table-2',
    iconBen:  'lucide:package-check',
    colorProb: '#EF4444',
  },
  {
    problema: 'Sin control de sobrantes ni mermas, stock real desconocido',
    beneficio: 'Registro formal de sobrantes y mermas; stock disponible reutilizable en el siguiente pedido',
    iconProb: 'lucide:package-minus',
    iconBen:  'lucide:package-plus',
    colorProb: '#F59E0B',
  },
  {
    problema: 'Pedidos al proveedor limitados a 2 semanas por dificultad de consolidar datos',
    beneficio: 'Consolidación automática de solicitudes con planificación extendida sin límite de semanas',
    iconProb: 'lucide:calendar-x',
    iconBen:  'lucide:calendar-check',
    colorProb: '#8B5CF6',
  },
  {
    problema: 'Múltiples Excel desconectados por área: inventario, solicitudes y proveedores separados',
    beneficio: 'Plataforma integrada: inventario, solicitudes, pedidos, bodega y usuarios en un solo sistema',
    iconProb: 'lucide:files',
    iconBen:  'lucide:layout-dashboard',
    colorProb: '#3B82F6',
  },
  {
    problema: 'Verificación física constante por falta de confianza en los registros digitales',
    beneficio: 'Trazabilidad completa y confiable elimina la necesidad de contrastar con el stock físico',
    iconProb: 'lucide:scan-eye',
    iconBen:  'lucide:shield-check',
    colorProb: '#10B981',
  },
];

const SlideSolucion: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-white px-12 py-8">
    <motion.div className="w-full max-w-5xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

      <div className="mb-6 text-center">
        <Chip className="mb-3 bg-[#FFB800]/20 text-[#1A1A1A] text-sm" size="md">La Solución</Chip>
        <h2 className="text-5xl font-bold text-[#1A1A1A]">Beneficios de KuHub</h2>
        <p className="mt-2 text-xl text-gray-500">Cada problema con una respuesta directa en el sistema</p>
      </div>

      {/* Encabezados de columna */}
      <div className="grid mb-2 px-2" style={{ gridTemplateColumns: '1fr 40px 1fr' }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Problema</span>
        </div>
        <div />
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Beneficio con KuHub</span>
        </div>
      </div>

      {/* Filas problema → beneficio */}
      <div className="flex flex-col gap-2.5">
        {beneficios.map((b, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.09 * (i + 1) }}
            className="grid items-center gap-3" style={{ gridTemplateColumns: '1fr 40px 1fr' }}
          >
            {/* Problema */}
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${b.colorProb}15` }}>
                <Icon icon={b.iconProb} width={18} color={b.colorProb} />
              </div>
              <p className="text-sm text-gray-500 leading-snug">{b.problema}</p>
            </div>

            {/* Flecha central */}
            <div className="flex justify-center">
              <Icon icon="lucide:arrow-right" width={20} color="#D1D5DB" />
            </div>

            {/* Beneficio */}
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#10B981]/15">
                <Icon icon={b.iconBen} width={18} color="#10B981" />
              </div>
              <p className="text-sm font-medium text-[#1A1A1A] leading-snug">{b.beneficio}</p>
            </div>
          </motion.div>
        ))}
      </div>

    </motion.div>
  </div>
);

// ─── Slide 5: Stack Tecnológico ───────────────────────────────────────────────

const frontendTech = [
  { icon: 'logos:react',            label: 'React 18' },
  { icon: 'logos:typescript-icon',  label: 'TypeScript' },
  { icon: 'logos:vitejs',           label: 'Vite 6' },
  { icon: 'logos:tailwindcss-icon', label: 'Tailwind CSS' },
];

const backendTech = [
  { icon: 'logos:java',        label: 'Java 21' },
  { icon: 'logos:spring-icon', label: 'Spring Boot' },
  { icon: 'logos:postgresql',  label: 'PostgreSQL' },
  { icon: 'logos:jwt-icon',    label: 'JWT Auth' },
];

const SlideStack: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-[#1A1A1A] text-white px-16 py-12">
    <motion.div className="w-full max-w-4xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-10 text-center">
        <Chip className="mb-4 bg-[#FFB800]/20 text-[#FFB800] text-sm" size="md">Arquitectura</Chip>
        <h2 className="text-5xl font-bold text-white">Stack Tecnológico</h2>
        <p className="mt-3 text-xl text-white/50">Tecnologías modernas para una aplicación robusta y escalable</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
          <div className="flex items-center gap-3 mb-6">
            <Icon icon="lucide:monitor" width={24} color="#FFB800" />
            <h3 className="text-xl font-bold text-[#FFB800]">Frontend</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {frontendTech.map((t, i) => (
              <motion.div key={t.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * (i + 1) }}
                className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <Icon icon={t.icon} width={30} />
                <span className="text-base text-white/80 font-medium">{t.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-7">
          <div className="flex items-center gap-3 mb-6">
            <Icon icon="lucide:server" width={24} color="#FFB800" />
            <h3 className="text-xl font-bold text-[#FFB800]">Backend</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {backendTech.map((t, i) => (
              <motion.div key={t.label} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * (i + 1) }}
                className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <Icon icon={t.icon} width={30} />
                <span className="text-base text-white/80 font-medium">{t.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <motion.div className="mt-7 flex justify-center gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>
        {['SPA · React Router v5', 'REST API · /api/v1', 'Docker · Lightsail AWS'].map((tag) => (
          <div key={tag} className="bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-full px-5 py-2 text-sm text-[#FFB800] font-medium">
            {tag}
          </div>
        ))}
      </motion.div>
    </motion.div>
  </div>
);

// ─── Slide 6: Flujo de trabajo ────────────────────────────────────────────────

const pasos = [
  { icon: 'lucide:user-check',    label: 'Solicitud',    sub: 'Docente → Gestor',      color: '#5BC2E7' },
  { icon: 'lucide:shopping-cart', label: 'Pedido',       sub: 'Consolida y envía',     color: '#43B02A' },
  { icon: 'lucide:truck',         label: 'Proveedor',    sub: 'Entrega confirmada',    color: '#6366F1' },
  { icon: 'lucide:package-check', label: 'Inventario',   sub: 'Stock principal',       color: '#FFB800' },
  { icon: 'lucide:warehouse',     label: 'Bodega',       sub: 'Tránsito · máx 3 días', color: '#AC4FC6' },
  { icon: 'lucide:chef-hat',      label: 'Preparar',     sub: 'Día anterior',          color: '#F59E0B' },
  { icon: 'lucide:utensils',      label: 'Día de Clase', sub: 'Se cocina',             color: '#FF585D' },
];

const detallesFlujo = [
  {
    icon: 'lucide:warehouse',
    titulo: 'Bodega Tránsito',
    desc: 'Almacena los productos necesarios para cumplir las entregas diarias. Capacidad operativa de hasta 3 días de clase.',
    color: '#AC4FC6',
  },
  {
    icon: 'lucide:chef-hat',
    titulo: 'Preparar',
    desc: 'El encargado arma el carro con los productos del día siguiente según las solicitudes aprobadas.',
    color: '#F59E0B',
  },
  {
    icon: 'lucide:utensils',
    titulo: 'Día de Clase',
    desc: 'El docente recibe los insumos listos. Los sobrantes regresan al sistema como stock disponible.',
    color: '#FF585D',
  },
];

const SlideFlujo: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-white px-14 py-10">
    <motion.div className="w-full max-w-5xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-8 text-center">
        <Chip className="mb-3 bg-[#FFB800]/20 text-[#1A1A1A] text-sm" size="md">Flujo principal</Chip>
        <h2 className="text-5xl font-bold text-[#1A1A1A]">¿Cómo Funciona?</h2>
        <p className="mt-2 text-xl text-gray-500">Del pedido al proveedor hasta el día de clase</p>
      </div>

      {/* Pasos */}
      <div className="flex items-start justify-between gap-1">
        {pasos.map((p, i) => (
          <React.Fragment key={p.label}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 * (i + 1) }}
              className="flex flex-col items-center gap-2 flex-1">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${p.color}18`, border: `2px solid ${p.color}40` }}>
                <Icon icon={p.icon} width={28} color={p.color} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[#1A1A1A] leading-snug">{p.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">{p.sub}</p>
              </div>
            </motion.div>
            {i < pasos.length - 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 * i + 0.25 }}
                className="flex-shrink-0 mt-7">
                <Icon icon="lucide:arrow-right" width={18} color="#D1D5DB" />
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Detalle de los 3 últimos pasos */}
      <motion.div className="mt-7 grid grid-cols-3 gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        {detallesFlujo.map((d) => (
          <div key={d.titulo} className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ backgroundColor: `${d.color}08`, border: `1.5px solid ${d.color}25` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${d.color}20` }}>
                <Icon icon={d.icon} width={20} color={d.color} />
              </div>
              <p className="text-base font-bold text-[#1A1A1A]">{d.titulo}</p>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{d.desc}</p>
          </div>
        ))}
      </motion.div>

    </motion.div>
  </div>
);

// ─── Slide 8: Metodología ────────────────────────────────────────────────────

const metodoPasos = [
  {
    num: '01',
    icon: 'lucide:users',
    titulo: 'Reunión Semanal con el Cliente',
    desc: 'Encuentro directo para recolectar información completa o parcial del módulo en ejecución, asegurando que el desarrollo responda a la necesidad real.',
    color: '#5BC2E7',
  },
  {
    num: '02',
    icon: 'lucide:search',
    titulo: 'Búsqueda de la Solución',
    desc: 'Análisis del problema planteado por el cliente y definición de cómo resolverlo a través del sistema, priorizando lo que genera mayor valor.',
    color: '#FFB800',
  },
  {
    num: '03',
    icon: 'lucide:calendar-check',
    titulo: 'Planificación Conjunta',
    desc: 'Planificación del módulo en conjunto con el cliente, alineando expectativas, alcance y tiempos de entrega de forma colaborativa.',
    color: '#43B02A',
  },
  {
    num: '04',
    icon: 'lucide:lightbulb',
    titulo: 'Mejoras como Sugerencias',
    desc: 'Presentación de mejoras implementadas al cliente como sugerencias. Su feedback cierra el ciclo e inicia el siguiente módulo.',
    color: '#FF585D',
  },
];

const SlideMetodologia: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-[#1A1A1A] px-12 py-10">
    <motion.div className="w-full max-w-5xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

      <div className="mb-8 text-center">
        <Chip className="mb-3 bg-[#FFB800]/20 text-[#FFB800] text-sm" size="md">Proceso de trabajo</Chip>
        <h2 className="text-5xl font-bold text-white">Metodología</h2>
        <p className="mt-3 text-xl text-white/40">Ciclo iterativo por módulo · Trabajo directo con el cliente</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {metodoPasos.map((p, i) => (
          <motion.div key={p.num}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 * (i + 1) }}
            className="flex gap-5 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex-shrink-0 pt-1">
              <span className="text-5xl font-black leading-none" style={{ color: `${p.color}30` }}>{p.num}</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${p.color}20` }}>
                  <Icon icon={p.icon} width={20} color={p.color} />
                </div>
                <p className="text-lg font-bold text-white leading-snug">{p.titulo}</p>
              </div>
              <p className="text-sm text-white/55 leading-relaxed">{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>


    </motion.div>
  </div>
);

// ─── Slide 9: Lecciones Aprendidas ───────────────────────────────────────────

const lecciones = [
  {
    numero: '01',
    icon: 'lucide:search',
    titulo: 'Primero entender el problema real',
    desc: 'Mapear exactamente cómo operaban con Excel y dónde fallaba fue la base de todo el diseño. Sin ese diagnóstico previo, el sistema no habría resuelto nada.',
    color: '#FFB800',
  },
  {
    numero: '02',
    icon: 'lucide:git-branch',
    titulo: 'La trazabilidad se diseña desde el inicio',
    desc: 'Registrar quién hizo qué, cuándo y por qué no es un extra: es la base del sistema. Añadirla después habría requerido rediseñar toda la arquitectura.',
    color: '#10B981',
  },
  {
    numero: '03',
    icon: 'lucide:settings-2',
    titulo: 'Roles dinámicos eliminan desarrollo constante',
    desc: 'La implementación de roles dinámicos permite que el administrador asigne las vistas necesarias a cada usuario cuando el negocio lo exige, sin requerir intervención del equipo de desarrollo.',
    color: '#3B82F6',
  },
  {
    numero: '04',
    icon: 'lucide:search-code',
    titulo: 'Analizar antes de implementar',
    desc: 'El análisis profundo del problema y de cómo resolverlo mediante el sistema evita desarrollar funcionalidades que no llegan al producto final. Pensar más antes de crear ahorra tiempo y esfuerzo.',
    color: '#8B5CF6',
  },
];

const leccionCierre = {
  numero: '05',
  icon: 'lucide:infinity',
  titulo: 'El legado: siempre se puede mejorar',
  desc: 'Todo sistema es un punto de partida, no un destino. KuHub sienta las bases para futuras mejoras; cada versión entrega más valor y cualquier equipo que lo continúe encontrará campo para crecer y perfeccionar lo construido.',
  color: '#FFB800',
};

const SlideLecciones: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-white px-12 py-8">
    <motion.div className="w-full max-w-5xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="mb-6 text-center">
        <Chip className="mb-3 bg-[#FFB800]/20 text-[#1A1A1A] text-sm" size="md">Reflexión final</Chip>
        <h2 className="text-5xl font-bold text-[#1A1A1A]">Lecciones Aprendidas</h2>
        <p className="mt-3 text-xl text-gray-500">Lo que el desarrollo de KuHub nos dejó como equipo</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {lecciones.map((l, i) => (
          <motion.div key={l.numero} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 * (i + 1) }}
            className="flex gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-5">
            <div className="flex-shrink-0 pt-1">
              <span className="text-5xl font-black leading-none" style={{ color: `${l.color}22` }}>{l.numero}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${l.color}15` }}>
                  <Icon icon={l.icon} width={18} color={l.color} />
                </div>
                <p className="text-base font-bold text-[#1A1A1A] leading-snug">{l.titulo}</p>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{l.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lección 05 — cierre destacado */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.55 }}
        className="mt-4 flex items-center gap-6 rounded-2xl px-7 py-5 border-2"
        style={{ backgroundColor: `${leccionCierre.color}08`, borderColor: `${leccionCierre.color}30` }}>
        <span className="text-6xl font-black leading-none flex-shrink-0" style={{ color: `${leccionCierre.color}30` }}>{leccionCierre.numero}</span>
        <div className="w-px h-12 bg-[#FFB800]/20 flex-shrink-0" />
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${leccionCierre.color}20` }}>
          <Icon icon={leccionCierre.icon} width={26} color={leccionCierre.color} />
        </div>
        <div>
          <p className="text-lg font-bold text-[#1A1A1A]">{leccionCierre.titulo}</p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{leccionCierre.desc}</p>
        </div>
      </motion.div>

    </motion.div>
  </div>
);

// ─── Listado de slides ────────────────────────────────────────────────────────

const SLIDES = [
  { id: 'portada',     label: 'Portada',     component: SlidePortada },
  { id: 'problema',    label: 'Problema',    component: SlideProblema },
  { id: 'porquekuhub', label: '¿Por qué?',  component: SlidePorQueKuHub },
  { id: 'solucion',    label: 'Solución',    component: SlideSolucion },
  { id: 'pruebas',     label: 'Pruebas',     component: SlidePruebas },
  { id: 'mejoras',     label: 'Mejoras',     component: SlideMejoras },
  { id: 'stack',       label: 'Stack',       component: SlideStack },
  { id: 'flujo',       label: 'Flujo',       component: SlideFlujo },
  { id: 'metodologia', label: 'Metodología', component: SlideMetodologia },
  { id: 'lecciones',   label: 'Lecciones',   component: SlideLecciones },
];

// ─── Componente principal ─────────────────────────────────────────────────────

const PresentacionPage: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<Direction>(1);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= SLIDES.length) return;
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current]);

  const prev = useCallback(() => goTo(current - 1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  const SlideComponent = SLIDES[current].component;

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX;
    const mid = window.innerWidth / 2;
    if (x >= mid) next();
    else prev();
  }, [next, prev]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#1A1A1A]">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div key={current} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="absolute inset-0">
          <SlideComponent />
        </motion.div>
      </AnimatePresence>

      {/* Zonas de clic izquierda / derecha */}
      <div className="absolute inset-0 z-10 flex" onClick={handleClick} style={{ cursor: 'pointer' }}>
        {/* Mitad izquierda: hover sutil */}
        <div className="w-1/2 h-full group flex items-center justify-start pl-6">
          {current > 0 && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2 text-white/40">
              <Icon icon="lucide:chevron-left" width={32} />
            </div>
          )}
        </div>
        {/* Mitad derecha */}
        <div className="w-1/2 h-full group flex items-center justify-end pr-6">
          {current < SLIDES.length - 1 && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2 text-white/40">
              <Icon icon="lucide:chevron-right" width={32} />
            </div>
          )}
        </div>
      </div>

      {/* Indicador de slide (sup. izq.) */}
      <div className="absolute top-5 left-6 z-20 flex items-center gap-2 pointer-events-none">
        <div className="w-7 h-7 rounded bg-[#FFB800] flex items-center justify-center">
          <span className="text-xs font-bold text-[#1A1A1A]">{current + 1}</span>
        </div>
        <span className="text-sm text-white/40 font-medium">{SLIDES[current].label}</span>
      </div>

      {/* KuHub badge (sup. der.) */}
      <div className="absolute top-5 right-6 z-20 flex items-center gap-2 opacity-40 pointer-events-none">
        <Icon icon="lucide:warehouse" width={16} color="#FFB800" />
        <span className="text-sm text-white font-semibold tracking-wide">KuHub</span>
      </div>

      {/* Puntos de navegación */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {SLIDES.map((s, i) => (
          <button key={s.id} onClick={(e) => { e.stopPropagation(); goTo(i); }}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-7 h-2.5 bg-[#FFB800]' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/50'}`}
          />
        ))}
      </div>

    </div>
  );
};

export default PresentacionPage;
