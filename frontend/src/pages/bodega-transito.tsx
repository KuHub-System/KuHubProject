import React from 'react';
import {
  Card, CardBody, CardHeader, Button, Chip, Divider,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
  Input, Checkbox, ScrollShadow
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { ISolicitud, IItemSolicitud } from '../types/solicitud.types';
import { obtenerTodasSolicitudesService, actualizarEstadoBodegaService, obtenerSolicitudPorIdService } from '../services/solicitud-service';
import { obtenerRecetaPorIdService } from '../services/receta-service';

// Mapa de Bloques Horarios según imagen proporcionada
const BLOQUES_HORARIOS: Record<number, string> = {
  1: '8:01 - 8:40',
  2: '8:41 - 9:20',
  3: '9:31 - 10:10',
  4: '10:11 - 10:50',
  5: '11:01 - 11:40',
  6: '11:41 - 12:20',
  7: '12:31 - 13:10',
  8: '13:11 - 13:50',
  9: '14:01 - 14:40',
  10: '14:41 - 15:20',
  11: '15:31 - 16:10',
  12: '16:11 - 16:50',
  13: '17:01 - 17:40',
  14: '17:41 - 18:20',
  15: '18:21 - 19:00',
  16: '19:11 - 19:50',
  17: '19:51 - 20:30',
  18: '20:41 - 21:20',
  19: '21:21 - 22:00',
  20: '22:11 - 22:50'
};

const getHorarioString = (inicio: number, fin: number) => {
  const start = BLOQUES_HORARIOS[inicio]?.split(' - ')[0] || '';
  const end = BLOQUES_HORARIOS[fin]?.split(' - ')[1] || '';
  return start && end ? `${start} - ${end}` : 'Horario no definido';
};

/**
 * Componente para mostrar una solicitud individual en formato tarjeta
 */
interface RequestCardProps {
  solicitud: ISolicitud;
  onUpdate: () => void;
  onAddExtra: (solicitud: ISolicitud) => void;
  onViewDetail: (solicitud: ISolicitud) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ solicitud, onUpdate, onAddExtra, onViewDetail }) => {
  const isArmado = solicitud.estadoBodega === 'Armado';

  const handleToggleArmado = async () => {
    const nuevoEstado = isArmado ? 'Pendiente' : 'Armado';

    // Si es fake, solo actualizamos visualmente (simulacion)
    if (solicitud.id.startsWith('fake-')) {
      solicitud.estadoBodega = nuevoEstado;
      onUpdate();
      return;
    }

    await actualizarEstadoBodegaService(solicitud.id, nuevoEstado);
    onUpdate();
  };
  return (
    <Card className={`w-full mb-3 border-l-4 shadow-sm hover:shadow-md transition-shadow ${isArmado ? 'border-success bg-green-50/30 dark:bg-success-50/10' : 'border-primary bg-white dark:bg-content1'}`}>
      <CardBody className="py-3 px-4">
        <div className="flex justify-between items-start">
          <div className="flex-grow pr-2">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-bold text-md ${isArmado ? 'text-success-700 dark:text-success-400' : 'text-secondary dark:text-foreground'}`}>{solicitud.asignaturaNombre}</h4>
              {isArmado && (
                <Chip size="sm" color="success" variant="flat" className="h-6 px-1">
                  <span className="font-bold text-xs">LISTO</span>
                </Chip>
              )}
            </div>
            <p className="text-sm text-default-600 flex items-center gap-1.5 font-medium">
              <Icon icon="lucide:user" className="text-default-400" width={14} />
              {solicitud.profesorNombre}
            </p>
            {/* Horario */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 dark:bg-orange-50/10 rounded border border-orange-100 dark:border-default-200">
                <Icon icon="lucide:clock" className="text-primary-600" width={14} />
                <span className="text-xs font-bold text-primary-700 dark:text-primary-400">{getHorarioString(solicitud.bloqueInicio, solicitud.bloqueFin)}</span>
              </div>
              <span className="text-[10px] uppercase text-default-400 font-bold tracking-wide">Bloques {solicitud.bloqueInicio}-{solicitud.bloqueFin}</span>
            </div>

            <p className="text-xs text-default-500 mt-2 font-medium">
              Items: {solicitud.items.length + (solicitud.itemsAdicionalesBodega?.length || 0)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              isIconOnly
              size="sm"
              variant={isArmado ? "solid" : "bordered"}
              color={isArmado ? "success" : "default"}
              onPress={handleToggleArmado} // Corregido: onPress duplicado eliminado
              title={isArmado ? "Marcar como pendiente" : "Marcar como armado"}
              className={`${!isArmado ? 'border-default-300 text-default-500 hover:text-success hover:border-success' : ''}`}
            >
              <Icon icon={isArmado ? "lucide:check-circle-2" : "lucide:circle"} width={20} />
            </Button>

            <div className="flex gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => onAddExtra(solicitud)}
                title="Agregar Extra"
                className="text-warning-600 hover:bg-warning-50 hover:text-warning-700 min-w-8 w-8 h-8"
              >
                <Icon icon="lucide:plus" width={18} />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => onViewDetail(solicitud)}
                title="Ver Detalle"
                className="text-gastronomia hover:bg-gastronomia-secondary/10 hover:text-gastronomia min-w-8 w-8 h-8"
              >
                <Icon icon="lucide:eye" width={18} />
              </Button>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

/**
 * Página principal de Bodega de Tránsito
 */
const BodegaTransitoPage: React.FC = () => {
  const [solicitudes, setSolicitudes] = React.useState<ISolicitud[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

  // Modals state
  const { isOpen: isExtraOpen, onOpen: onExtraOpen, onOpenChange: onExtraOpenChange } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onOpenChange: onDetailOpenChange } = useDisclosure();

  const [selectedSolicitud, setSelectedSolicitud] = React.useState<ISolicitud | null>(null);
  const [recetaInstrucciones, setRecetaInstrucciones] = React.useState<string>('');

  // Extra Item Form State
  const [extraNombre, setExtraNombre] = React.useState('');
  const [extraCantidad, setExtraCantidad] = React.useState('');
  const [extraUnidad, setExtraUnidad] = React.useState('');

  // --- DATOS FAKE PARA PRUEBAS (BORRAR LUEGO) ---
  const FAKE_REQUESTS: ISolicitud[] = [
    {
      id: 'fake-1',
      asignaturaId: 'asig-1',
      asignaturaNombre: 'Pastelería Avanzada',
      profesorId: 'prof-1',
      profesorNombre: 'Chef Gustavo',
      fecha: new Date().toISOString().split('T')[0], // HOY
      bloqueInicio: 1,
      bloqueFin: 4,
      recetaId: 'rec-1',
      recetaNombre: 'Torta de Hojarasca',
      items: [
        { id: 'i1', productoId: 'p1', productoNombre: 'Harina', cantidad: 2, unidadMedida: 'kg', esAdicional: false },
        { id: 'i2', productoId: 'p2', productoNombre: 'Manjar', cantidad: 3, unidadMedida: 'kg', esAdicional: false },
        { id: 'i3', productoId: 'p3', productoNombre: 'Huevos', cantidad: 12, unidadMedida: 'un', esAdicional: false }
      ],
      observaciones: 'Solicitud de prueba (Fake)',
      esCustom: false,
      estado: 'Aceptada',
      estadoBodega: 'Pendiente',
      fechaCreacion: new Date().toISOString(),
      fechaUltimaModificacion: new Date().toISOString(),
      semana: 4
    },
    {
      id: 'fake-2',
      asignaturaId: 'asig-2',
      asignaturaNombre: 'Cocina Chilena',
      profesorId: 'prof-2',
      profesorNombre: 'Chef Maria',
      fecha: new Date().toISOString().split('T')[0], // HOY
      bloqueInicio: 5,
      bloqueFin: 6,
      recetaId: null,
      recetaNombre: null,
      items: [
        { id: 'i4', productoId: 'p4', productoNombre: 'Porotos Granados', cantidad: 5, unidadMedida: 'kg', esAdicional: true },
        { id: 'i5', productoId: 'p5', productoNombre: 'Zapallo', cantidad: 2, unidadMedida: 'kg', esAdicional: true },
        { id: 'i6', productoId: 'p6', productoNombre: 'Choclo', cantidad: 10, unidadMedida: 'un', esAdicional: true }
      ],
      observaciones: 'Ingredientes frescos por favor.',
      esCustom: true,
      estado: 'Aceptada',
      estadoBodega: 'Armado', // Ya armado para probar visual
      fechaCreacion: new Date().toISOString(),
      fechaUltimaModificacion: new Date().toISOString(),
      semana: 4
    },
    {
      id: 'fake-3',
      asignaturaId: 'asig-3',
      asignaturaNombre: 'Panadería Básica',
      profesorId: 'prof-3',
      profesorNombre: 'Chef Pedro',
      fecha: new Date(Date.now() + 86400000).toISOString().split('T')[0], // MAÑANA
      bloqueInicio: 9,
      bloqueFin: 12,
      recetaId: 'rec-2',
      recetaNombre: 'Marraquetas',
      items: [
        { id: 'i7', productoId: 'p1', productoNombre: 'Harina Panadera', cantidad: 25, unidadMedida: 'kg', esAdicional: false },
        { id: 'i8', productoId: 'p7', productoNombre: 'Levadura Fresca', cantidad: 500, unidadMedida: 'gr', esAdicional: false },
        { id: 'i9', productoId: 'p8', productoNombre: 'Sal', cantidad: 200, unidadMedida: 'gr', esAdicional: false }
      ],
      observaciones: '',
      esCustom: false,
      estado: 'Aceptada',
      estadoBodega: 'Pendiente',
      fechaCreacion: new Date().toISOString(),
      fechaUltimaModificacion: new Date().toISOString(),
      semana: 4
    }
  ] as ISolicitud[];
  // ----------------------------------------------

  const loadData = async () => {
    try {
      const data = await obtenerTodasSolicitudesService();
      // Filtrar solo aceptadas
      const realFiltered = data.filter(s => s.estado === 'Aceptada' || s.estado === 'AceptadaModificada');

      // Combinar con FAKE data (Solo visualización, no se guardan en BD real al cargar)
      setSolicitudes([...realFiltered, ...FAKE_REQUESTS]);
    } catch (error) {
      console.error("Error loading requests:", error);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Navegación de fechas
  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Filtrado por día
  const getRequestsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    // Aseguramos que la fecha coincida exactamente string a string (YYYY-MM-DD)
    return solicitudes.filter(s => s.fecha && s.fecha.startsWith(dateStr));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Handlers
  const handleOpenExtra = (solicitud: ISolicitud) => {
    setSelectedSolicitud(solicitud);
    setExtraNombre('');
    setExtraCantidad('');
    setExtraUnidad('');
    onExtraOpen();
  };

  const handleSaveExtra = async () => {
    if (!selectedSolicitud || !extraNombre || !extraCantidad) return;

    const newItem: IItemSolicitud = {
      id: Date.now().toString(),
      productoId: 'extra-' + Date.now(),
      productoNombre: extraNombre,
      cantidad: parseFloat(extraCantidad),
      unidadMedida: extraUnidad || 'un',
      esAdicional: true,
      esAdicionalBodega: true // Flag custom para saber que es de bodega si quisieramos
    } as any;

    const currentExtras = selectedSolicitud.itemsAdicionalesBodega || [];
    const newExtras = [...currentExtras, newItem];

    await actualizarEstadoBodegaService(selectedSolicitud.id, selectedSolicitud.estadoBodega || 'Pendiente', newExtras);
    await loadData();
    onExtraOpenChange();
  };

  const handleOpenDetail = async (solicitud: ISolicitud) => {
    setSelectedSolicitud(solicitud);
    setRecetaInstrucciones('');

    if (solicitud.recetaId) {
      try {
        const receta = await obtenerRecetaPorIdService(solicitud.recetaId);
        setRecetaInstrucciones(receta.instrucciones);
      } catch (e) {
        setRecetaInstrucciones('No se pudo cargar la receta o no existe.');
      }
    }

    onDetailOpen();
  };

  const handlePrint = () => {
    window.print();
  };

  // Fechas para las columnas
  const dateCol1 = new Date(selectedDate);
  const dateCol2 = new Date(selectedDate);
  dateCol2.setDate(selectedDate.getDate() + 1);

  return (
    <div className="container mx-auto px-4 h-full flex flex-col font-sans">
      {/* Header - No imprimir */}
      <div className="print:hidden mb-6 bg-white dark:bg-content1 p-6 rounded-xl shadow-sm border border-default-200 dark:border-default-100">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-1.5 h-8 bg-primary rounded-full"></div>
              <h1 className="text-3xl font-bold text-secondary dark:text-foreground tracking-tight">Bodega de Tránsito</h1>
            </div>
            <p className="text-default-500 pl-4.5">Gestión de armado de carros diarios | <span className="text-gastronomia font-semibold">Escuela de Gastronomía</span></p>
          </div>
          <div className="flex items-center gap-2 bg-default-50 dark:bg-default-100/20 rounded-full p-1.5 border border-default-200 dark:border-default-100">
            <Button isIconOnly variant="light" onPress={handlePrevDay} className="rounded-full text-secondary dark:text-foreground hover:bg-white dark:hover:bg-default-100 hover:shadow-sm">
              <Icon icon="lucide:chevron-left" width={20} />
            </Button>
            <Button variant="flat" onPress={handleToday} className="min-w-[140px] font-semibold capitalize bg-white dark:bg-content1 shadow-sm text-secondary dark:text-foreground rounded-full border border-default-100 dark:border-default-200">
              <Icon icon="lucide:calendar" className="mr-1 text-primary" />
              {formatDate(selectedDate)}
            </Button>
            <Button isIconOnly variant="light" onPress={handleNextDay} className="rounded-full text-secondary dark:text-foreground hover:bg-white dark:hover:bg-default-100 hover:shadow-sm">
              <Icon icon="lucide:chevron-right" width={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid de 2 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden p-1 print:block print:overflow-visible">

        {/* Columna 1 */}
        <Card className="flex flex-col h-full print:hidden shadow-md border-t-4 border-t-gastronomia bg-white dark:bg-content1">
          <CardHeader className="bg-white dark:bg-content1 py-4 px-5 flex justify-between items-center border-b border-default-100 dark:border-default-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gastronomia-secondary/20 rounded-lg text-gastronomia">
                <Icon icon="lucide:calendar-days" width={20} />
              </div>
              <div>
                <span className="block text-xs font-semibold text-default-400 uppercase tracking-wider">Día Seleccionado</span>
                <span className="text-lg font-bold text-secondary dark:text-foreground capitalize leading-none">{formatDate(dateCol1)}</span>
              </div>
            </div>
            <Chip size="sm" className="bg-secondary text-white font-medium">{getRequestsForDate(dateCol1).length} pedidos</Chip>
          </CardHeader>
          <CardBody className="p-4 bg-default-50/50 dark:bg-transparent overflow-y-auto">
            {getRequestsForDate(dateCol1).length > 0 ? (
              getRequestsForDate(dateCol1).map(solicitud => (
                <RequestCard
                  key={solicitud.id}
                  solicitud={solicitud}
                  onUpdate={loadData}
                  onAddExtra={handleOpenExtra}
                  onViewDetail={handleOpenDetail}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-default-300">
                <Icon icon="lucide:package-open" className="text-6xl mb-4 opacity-50 stroke-1" />
                <p className="font-medium text-lg">Sin pedidos para hoy</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Columna 2 */}
        <Card className="flex flex-col h-full print:hidden shadow-md border-t-4 border-t-secondary bg-white dark:bg-content1">
          <CardHeader className="bg-white dark:bg-content1 py-4 px-5 flex justify-between items-center border-b border-default-100 dark:border-default-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-default-100 dark:bg-default-50/20 rounded-lg text-default-600 dark:text-default-400">
                <Icon icon="lucide:calendar-clock" width={20} />
              </div>
              <div>
                <span className="block text-xs font-semibold text-default-400 uppercase tracking-wider">Día Siguiente</span>
                <span className="text-lg font-bold text-default-600 dark:text-default-400 capitalize leading-none">{formatDate(dateCol2)}</span>
              </div>
            </div>
            <Chip size="sm" variant="flat" className="text-default-600 dark:text-default-400">{getRequestsForDate(dateCol2).length} pedidos</Chip>
          </CardHeader>
          <CardBody className="p-4 bg-default-50/50 dark:bg-transparent overflow-y-auto">
            {getRequestsForDate(dateCol2).length > 0 ? (
              getRequestsForDate(dateCol2).map(solicitud => (
                <RequestCard
                  key={solicitud.id}
                  solicitud={solicitud}
                  onUpdate={loadData}
                  onAddExtra={handleOpenExtra}
                  onViewDetail={handleOpenDetail}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-default-300">
                <Icon icon="lucide:package-open" className="text-6xl mb-4 opacity-50 stroke-1" />
                <p className="font-medium text-lg">Sin pedidos planificados</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Modal Agregar Extra */}
      <Modal isOpen={isExtraOpen} onOpenChange={onExtraOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-default-100 dark:border-default-50 bg-default-50 dark:bg-content2">
                <span className="text-gastronomia font-bold">Agregar Item Extra</span>
              </ModalHeader>
              <ModalBody className="py-6">
                <Input
                  label="Producto"
                  placeholder="Ej: Harina sin polvos"
                  variant="bordered"
                  labelPlacement="outside"
                  value={extraNombre}
                  onValueChange={setExtraNombre}
                  autoFocus
                  classNames={{
                    inputWrapper: "border-default-200 dark:border-default-100 data-[hover=true]:border-gastronomia focus-within:!border-gastronomia bg-default-50 dark:bg-default-100/50",
                    label: "text-secondary dark:text-foreground font-medium"
                  }}
                />
                <div className="flex gap-4 mt-2">
                  <Input
                    label="Cantidad"
                    type="number"
                    placeholder="0"
                    variant="bordered"
                    labelPlacement="outside"
                    value={extraCantidad}
                    onValueChange={setExtraCantidad}
                    className="flex-grow"
                    classNames={{
                      inputWrapper: "border-default-200 dark:border-default-100 data-[hover=true]:border-gastronomia focus-within:!border-gastronomia bg-default-50 dark:bg-default-100/50",
                      label: "text-secondary dark:text-foreground font-medium"
                    }}
                  />
                  <Input
                    label="Unidad"
                    placeholder="kg"
                    variant="bordered"
                    labelPlacement="outside"
                    value={extraUnidad}
                    onValueChange={setExtraUnidad}
                    className="w-1/3"
                    classNames={{
                      inputWrapper: "border-default-200 dark:border-default-100 data-[hover=true]:border-gastronomia focus-within:!border-gastronomia bg-default-50 dark:bg-default-100/50",
                      label: "text-secondary dark:text-foreground font-medium"
                    }}
                  />
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-default-100 dark:border-default-50 bg-default-50 dark:bg-content2">
                <Button variant="light" onPress={onClose} className="font-medium">Cancelar</Button>
                <Button className="bg-gastronomia text-white font-medium shadow-md shadow-gastronomia/20" onPress={handleSaveExtra}>
                  Guardar Item
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal Detalle (Imprimible) */}
      <Modal
        isOpen={isDetailOpen}
        onOpenChange={onDetailOpenChange}
        size="3xl"
        scrollBehavior="inside"
        className="print:shadow-none print:border-none print:w-full print:max-w-none print:m-0 print:h-auto"
        backdrop="blur"
      >
        <ModalContent className="print:shadow-none">
          {(onClose) => (
            <>
              <ModalHeader className="flex justify-between items-center print:hidden border-b border-default-100 pr-12 py-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-secondary text-white rounded-md">
                    <Icon icon="lucide:clipboard-list" />
                  </div>
                  <span className="font-bold text-secondary text-xl">Detalle de Solicitud</span>
                </div>
                <Button
                  startContent={<Icon icon="lucide:printer" />}
                  onPress={handlePrint}
                  className="mr-2 bg-default-100 text-secondary font-medium hover:bg-default-200"
                  variant="flat"
                >
                  Imprimir
                </Button>
              </ModalHeader>
              <ModalBody className="print:p-0 print:overflow-visible p-6 bg-default-50/30">
                {selectedSolicitud && (
                  <div className="space-y-6 print:space-y-4">
                    {/* Encabezado Impresión */}
                    <div className="hidden print:flex mb-6 border-b-2 border-black pb-4 justify-between items-end">
                      <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wide">Solicitud de Insumos</h1>
                        <p className="text-sm font-bold mt-1">Escuela de Gastronomía | Duoc UC</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Fecha Impresión</p>
                        <p className="font-mono font-bold">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Info General */}
                    <div className="bg-white p-5 rounded-xl border border-default-200 shadow-sm print:shadow-none print:border-black print:rounded-none">
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                          <p className="text-xs text-default-500 font-bold uppercase tracking-wider mb-1">Asignatura</p>
                          <p className="text-lg font-bold text-secondary">{selectedSolicitud.asignaturaNombre}</p>
                        </div>
                        <div>
                          <p className="text-xs text-default-500 font-bold uppercase tracking-wider mb-1">Profesor</p>
                          <p className="text-lg font-medium text-secondary">{selectedSolicitud.profesorNombre}</p>
                        </div>
                        <div className="flex gap-8">
                          <div>
                            <p className="text-xs text-default-500 font-bold uppercase tracking-wider mb-1">Fecha</p>
                            <p className="text-base font-mono text-secondary">{new Date(selectedSolicitud.fecha).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-default-500 font-bold uppercase tracking-wider mb-1">Bloques</p>
                            <p className="text-base font-mono text-secondary">{selectedSolicitud.bloqueInicio} - {selectedSolicitud.bloqueFin}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-default-500 font-bold uppercase tracking-wider mb-1">Receta Base</p>
                          <p className="text-base font-medium text-secondary">{selectedSolicitud.recetaNombre || 'Sin receta base'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Tabla Ingredientes */}
                    <div className="bg-white rounded-xl border border-default-200 shadow-sm overflow-hidden print:shadow-none print:border-black print:rounded-none">
                      <div className="bg-default-100 px-5 py-3 border-b border-default-200 print:bg-gray-200 print:border-black">
                        <h3 className="font-bold text-secondary text-sm uppercase tracking-wide">Ingredientes & Insumos</h3>
                      </div>
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-default-500 uppercase bg-default-50 print:bg-transparent">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Producto</th>
                            <th className="px-5 py-3 text-right font-semibold">Cant.</th>
                            <th className="px-5 py-3 font-semibold">Unidad</th>
                            <th className="px-5 py-3 text-center font-semibold">Origen</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-default-100">
                          {selectedSolicitud.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-default-50 print:hover:bg-transparent border-b border-default-100 print:border-gray-300">
                              <td className="px-5 py-3 text-secondary font-medium">{item.productoNombre}</td>
                              <td className="px-5 py-3 text-right font-mono text-secondary">{item.cantidad}</td>
                              <td className="px-5 py-3 text-default-500">{item.unidadMedida}</td>
                              <td className="px-5 py-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${item.esAdicional
                                  ? 'bg-warning-50 text-warning-700 border border-warning-200'
                                  : 'bg-default-100 text-default-600'
                                  }`}>
                                  {item.esAdicional ? 'Extra' : 'Receta'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {selectedSolicitud.itemsAdicionalesBodega?.map((item, idx) => (
                            <tr key={`extra-${idx}`} className="bg-gastronomia-secondary/10 print:bg-transparent border-b border-gastronomia-secondary/20 print:border-gray-300">
                              <td className="px-5 py-3 font-semibold text-gastronomia print:text-black">{item.productoNombre}</td>
                              <td className="px-5 py-3 text-right font-mono text-secondary">{item.cantidad}</td>
                              <td className="px-5 py-3 text-default-500">{item.unidadMedida}</td>
                              <td className="px-5 py-3 text-center">
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide bg-gastronomia text-white print:text-black print:bg-transparent print:border print:border-black">
                                  Bodega
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Preparación */}
                    {recetaInstrucciones && (
                      <div className="break-inside-avoid bg-white rounded-xl border border-default-200 shadow-sm overflow-hidden print:shadow-none print:border-black print:rounded-none">
                        <div className="bg-default-100 px-5 py-3 border-b border-default-200 print:bg-gray-200 print:border-black">
                          <h3 className="font-bold text-secondary text-sm uppercase tracking-wide">Preparación</h3>
                        </div>
                        <div className="p-5 font-serif text-secondary leading-relaxed bg-white print:text-justify text-sm whitespace-pre-wrap">
                          {recetaInstrucciones}
                        </div>
                      </div>
                    )}

                    {/* Observaciones */}
                    {selectedSolicitud.observaciones && (
                      <div className="break-inside-avoid">
                        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 print:border-black print:bg-white print:rounded-none">
                          <h3 className="text-warning-800 font-bold text-xs uppercase tracking-wide mb-1 print:text-black">Observaciones</h3>
                          <p className="italic text-secondary text-sm">{selectedSolicitud.observaciones}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="print:hidden border-t border-default-100 bg-white">
                <Button onPress={onClose} className="font-medium text-secondary">Cerrar</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .header, .sidebar, .navbar {
            display: none !important;
          }
          section[role="dialog"] {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
            background: white !important;
            border: none !important;
          }
          section[role="dialog"] * {
            visibility: visible !important;
          }
          button, [role="button"], .backdrop {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BodegaTransitoPage;