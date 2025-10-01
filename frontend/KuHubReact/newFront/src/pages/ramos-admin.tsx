import React from 'react';
import { 
  Card,
  CardBody,
  Input,
  Button,
  Chip,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
  Divider
} from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Interfaz para una sección de asignatura
 */
interface Seccion {
  id: string;
  numeroSeccion: string;
  profesorAsignado: string;
  horario: string;
  aula: string;
  capacidadMaxima: number;
  estudiantesInscritos: number;
  estado: 'Activa' | 'Inactiva' | 'Suspendida';
}

/**
 * Interfaz para una asignatura
 */
interface Asignatura {
  id: string;
  codigo: string;
  nombre: string;
  profesorCoordinador: string;
  creditos: number;
  semestre: string;
  departamento: string;
  descripcion: string;
  secciones: Seccion[];
}

/**
 * Interfaz para un profesor
 */
interface Profesor {
  id: string;
  nombre: string;
  email: string;
  departamento: string;
  especialidad: string;
}

/**
 * Datos simulados de profesores
 */
const profesoresDisponibles: Profesor[] = [
  { id: '1', nombre: 'Juan Pérez García', email: 'juan.perez@universidad.cl', departamento: 'Gastronomía', especialidad: 'Panadería' },
  { id: '2', nombre: 'María González López', email: 'maria.gonzalez@universidad.cl', departamento: 'Gastronomía', especialidad: 'Pastelería' },
  { id: '3', nombre: 'Pedro Sánchez Ruiz', email: 'pedro.sanchez@universidad.cl', departamento: 'Gastronomía', especialidad: 'Cocina Internacional' },
  { id: '4', nombre: 'Ana Rodríguez Silva', email: 'ana.rodriguez@universidad.cl', departamento: 'Gastronomía', especialidad: 'Cocina Chilena' },
  { id: '5', nombre: 'Carlos Muñoz Torres', email: 'carlos.munoz@universidad.cl', departamento: 'Gastronomía', especialidad: 'Técnicas Culinarias' },
  { id: '6', nombre: 'Luisa Martínez Flores', email: 'luisa.martinez@universidad.cl', departamento: 'Gastronomía', especialidad: 'Nutrición Culinaria' },
  { id: '7', nombre: 'Roberto Gómez Castro', email: 'roberto.gomez@universidad.cl', departamento: 'Gastronomía', especialidad: 'Gestión Gastronómica' }
];

/**
 * Datos simulados de asignaturas con secciones
 */
const asignaturasIniciales: Asignatura[] = [
  {
    id: '1',
    codigo: 'GAS-101',
    nombre: 'Panadería Básica',
    profesorCoordinador: 'Juan Pérez García',
    creditos: 4,
    semestre: '2025-1',
    departamento: 'Gastronomía',
    descripcion: 'Fundamentos básicos de panadería, técnicas de amasado y horneado.',
    secciones: [
      { id: '1-1', numeroSeccion: '101', profesorAsignado: 'Juan Pérez García', horario: 'Lun-Mie 08:00-10:00', aula: 'Lab Panadería A', capacidadMaxima: 20, estudiantesInscritos: 18, estado: 'Activa' },
      { id: '1-2', numeroSeccion: '102', profesorAsignado: 'Juan Pérez García', horario: 'Lun-Mie 10:00-12:00', aula: 'Lab Panadería A', capacidadMaxima: 20, estudiantesInscritos: 19, estado: 'Activa' },
      { id: '1-3', numeroSeccion: '103', profesorAsignado: 'Carlos Muñoz Torres', horario: 'Mar-Jue 14:00-16:00', aula: 'Lab Panadería B', capacidadMaxima: 20, estudiantesInscritos: 15, estado: 'Activa' }
    ]
  },
  {
    id: '2',
    codigo: 'GAS-102',
    nombre: 'Pastelería Avanzada',
    profesorCoordinador: 'María González López',
    creditos: 5,
    semestre: '2025-1',
    departamento: 'Gastronomía',
    descripcion: 'Técnicas avanzadas de pastelería, decoración y presentación.',
    secciones: [
      { id: '2-1', numeroSeccion: '201', profesorAsignado: 'María González López', horario: 'Lun-Vie 09:00-11:00', aula: 'Lab Pastelería A', capacidadMaxima: 15, estudiantesInscritos: 14, estado: 'Activa' },
      { id: '2-2', numeroSeccion: '202', profesorAsignado: 'María González López', horario: 'Lun-Vie 14:00-16:00', aula: 'Lab Pastelería A', capacidadMaxima: 15, estudiantesInscritos: 13, estado: 'Activa' },
      { id: '2-3', numeroSeccion: '203', profesorAsignado: 'Luisa Martínez Flores', horario: 'Mar-Jue 10:00-13:00', aula: 'Lab Pastelería B', capacidadMaxima: 15, estudiantesInscritos: 0, estado: 'Suspendida' }
    ]
  },
  {
    id: '3',
    nombre: 'Cocina Internacional',
    codigo: 'GAS-201',
    profesorCoordinador: 'Pedro Sánchez Ruiz',
    creditos: 4,
    semestre: '2025-1',
    departamento: 'Gastronomía',
    descripcion: 'Exploración de cocinas del mundo, técnicas y ingredientes internacionales.',
    secciones: [
      { id: '3-1', numeroSeccion: '301', profesorAsignado: 'Pedro Sánchez Ruiz', horario: 'Lun-Mie 15:00-18:00', aula: 'Cocina Internacional A', capacidadMaxima: 18, estudiantesInscritos: 16, estado: 'Activa' },
      { id: '3-2', numeroSeccion: '302', profesorAsignado: 'Pedro Sánchez Ruiz', horario: 'Mar-Jue 08:00-11:00', aula: 'Cocina Internacional A', capacidadMaxima: 18, estudiantesInscritos: 17, estado: 'Activa' }
    ]
  },
  {
    id: '4',
    codigo: 'GAS-202',
    nombre: 'Cocina Chilena',
    profesorCoordinador: 'Ana Rodríguez Silva',
    creditos: 3,
    semestre: '2025-1',
    departamento: 'Gastronomía',
    descripcion: 'Patrimonio culinario chileno, técnicas tradicionales y platos típicos.',
    secciones: [
      { id: '4-1', numeroSeccion: '401', profesorAsignado: 'Ana Rodríguez Silva', horario: 'Vie 09:00-12:00', aula: 'Cocina Tradicional', capacidadMaxima: 25, estudiantesInscritos: 22, estado: 'Activa' },
      { id: '4-2', numeroSeccion: '402', profesorAsignado: 'Roberto Gómez Castro', horario: 'Vie 14:00-17:00', aula: 'Cocina Tradicional', capacidadMaxima: 25, estudiantesInscritos: 20, estado: 'Activa' }
    ]
  }
];

/**
 * Renderiza el estado de la sección
 */
const renderEstadoSeccion = (estado: string) => {
  switch (estado) {
    case 'Activa':
      return <Chip color="success" size="sm">{estado}</Chip>;
    case 'Inactiva':
      return <Chip color="default" size="sm">{estado}</Chip>;
    case 'Suspendida':
      return <Chip color="danger" size="sm">{estado}</Chip>;
    default:
      return <Chip size="sm">{estado}</Chip>;
  }
};

/**
 * Página de gestión de asignaturas con secciones
 */
const GestionAsignaturasPage: React.FC = () => {
  const [asignaturas, setAsignaturas] = React.useState<Asignatura[]>(asignaturasIniciales);
  const [filteredAsignaturas, setFilteredAsignaturas] = React.useState<Asignatura[]>(asignaturasIniciales);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [seccionSeleccionada, setSeccionSeleccionada] = React.useState<{asignatura: Asignatura, seccion: Seccion} | null>(null);
  
  const { isOpen: isSeccionModalOpen, onOpen: onSeccionModalOpen, onOpenChange: onSeccionModalOpenChange } = useDisclosure();
  const rowsPerPage = 5;

  /**
   * Filtra las asignaturas según el término de búsqueda
   */
  React.useEffect(() => {
    let filtered = [...asignaturas];
    
    if (searchTerm) {
      filtered = filtered.filter(asignatura => 
        asignatura.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asignatura.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asignatura.profesorCoordinador.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asignatura.secciones.some(seccion => 
          seccion.numeroSeccion.includes(searchTerm) ||
          seccion.profesorAsignado.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    setFilteredAsignaturas(filtered);
    setCurrentPage(1);
  }, [searchTerm, asignaturas]);

  /**
   * Calcula las asignaturas a mostrar en la página actual
   */
  const paginatedAsignaturas = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredAsignaturas.slice(start, end);
  }, [currentPage, filteredAsignaturas, rowsPerPage]);

  /**
   * Toggle la expansión de una fila
   */
  const toggleRowExpansion = (asignaturaId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(asignaturaId)) {
      newExpanded.delete(asignaturaId);
    } else {
      newExpanded.add(asignaturaId);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * Abre el modal para editar una sección
   */
  const editarSeccion = (asignatura: Asignatura, seccion: Seccion) => {
    setSeccionSeleccionada({ asignatura, seccion });
    onSeccionModalOpen();
  };

  /**
   * Guarda los cambios de una sección
   */
  const guardarSeccion = (seccionEditada: Seccion) => {
    if (!seccionSeleccionada) return;

    setAsignaturas(prevAsignaturas => 
      prevAsignaturas.map(asignatura => 
        asignatura.id === seccionSeleccionada.asignatura.id 
          ? {
              ...asignatura,
              secciones: asignatura.secciones.map(seccion => 
                seccion.id === seccionEditada.id ? seccionEditada : seccion
              )
            }
          : asignatura
      )
    );
    
    onSeccionModalOpenChange();
    setSeccionSeleccionada(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Gestión de Asignaturas</h1>
            <p className="text-default-500">
              Administre asignaturas, secciones y asignaciones de profesores.
            </p>
          </div>
          <Button 
            color="primary" 
            startContent={<Icon icon="lucide:plus" />}
          >
            Nueva Asignatura
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar asignaturas, códigos, profesores o secciones..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            startContent={<Icon icon="lucide:search" className="text-default-400" />}
            className="w-full md:w-96"
          />
        </div>

        {/* Cards de asignaturas */}
        <div className="space-y-4">
          {paginatedAsignaturas.map((asignatura) => (
            <Card key={asignatura.id} className="shadow-sm">
              <CardBody className="p-0">
                {/* Fila principal de la asignatura */}
                <div className="flex items-center justify-between p-4 border-b border-default-200">
                  <div className="flex items-center gap-4">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => toggleRowExpansion(asignatura.id)}
                    >
                      <Icon 
                        icon={expandedRows.has(asignatura.id) ? "lucide:chevron-down" : "lucide:chevron-right"} 
                        className="text-default-400"
                      />
                    </Button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{asignatura.nombre}</h3>
                        <Chip size="sm" color="primary">{asignatura.codigo}</Chip>
                      </div>
                      <p className="text-sm text-default-500">
                        Coordinador: {asignatura.profesorCoordinador} • {asignatura.creditos} créditos • {asignatura.semestre}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Chip color="secondary" size="sm">
                      {asignatura.secciones.length} secciones
                    </Chip>
                    <Chip 
                      size="sm" 
                      color={asignatura.secciones.every(s => s.estado === 'Activa') ? 'success' : 'warning'}
                    >
                      {asignatura.secciones.filter(s => s.estado === 'Activa').length} activas
                    </Chip>
                    <div className="flex gap-2">
                      <Button 
                        isIconOnly 
                        variant="light" 
                        size="sm"
                      >
                        <Icon icon="lucide:edit" className="text-primary" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sección expandible con las secciones */}
                <AnimatePresence>
                  {expandedRows.has(asignatura.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-default-50 dark:bg-default-100">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold text-sm">Secciones ({asignatura.secciones.length})</h4>
                          <Button 
                            size="sm"
                            color="primary"
                            variant="flat"
                            startContent={<Icon icon="lucide:plus" />}
                          >
                            Agregar Sección
                          </Button>
                        </div>
                        
                        <div className="grid gap-3">
                          {asignatura.secciones.map((seccion) => (
                            <div key={seccion.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg border border-default-200">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-default-500 mb-1">SECCIÓN</p>
                                  <p className="font-semibold text-lg">{seccion.numeroSeccion}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-default-500 mb-1">PROFESOR ASIGNADO</p>
                                  <p className="font-medium text-sm">{seccion.profesorAsignado}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-default-500 mb-1">HORARIO / AULA</p>
                                  <p className="text-sm">{seccion.horario}</p>
                                  <p className="text-xs text-default-400">{seccion.aula}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-default-500 mb-1">ESTUDIANTES</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm">
                                      {seccion.estudiantesInscritos}/{seccion.capacidadMaxima}
                                    </p>
                                    {renderEstadoSeccion(seccion.estado)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 ml-4">
                                <Button 
                                  isIconOnly
                                  variant="light"
                                  size="sm"
                                  onPress={() => editarSeccion(asignatura, seccion)}
                                >
                                  <Icon icon="lucide:edit" className="text-primary" />
                                </Button>
                                <Button 
                                  isIconOnly
                                  variant="light"
                                  size="sm"
                                  color="danger"
                                >
                                  <Icon icon="lucide:trash-2" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Paginación */}
        {filteredAsignaturas.length > rowsPerPage && (
          <div className="flex w-full justify-center">
            <Pagination
              total={Math.ceil(filteredAsignaturas.length / rowsPerPage)}
              page={currentPage}
              onChange={setCurrentPage}
              showControls
            />
          </div>
        )}
      </motion.div>

      {/* Modal para editar sección */}
      <Modal isOpen={isSeccionModalOpen} onOpenChange={onSeccionModalOpenChange} size="lg">
        <ModalContent>
          {(onClose) => (
            <EditarSeccionModal 
              seccionData={seccionSeleccionada}
              profesores={profesoresDisponibles}
              onClose={onClose}
              onSave={guardarSeccion}
            />
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

/**
 * Modal para editar una sección
 */
interface EditarSeccionModalProps {
  seccionData: {asignatura: Asignatura, seccion: Seccion} | null;
  profesores: Profesor[];
  onClose: () => void;
  onSave: (seccion: Seccion) => void;
}

const EditarSeccionModal: React.FC<EditarSeccionModalProps> = ({ seccionData, profesores, onClose, onSave }) => {
  const [numeroSeccion, setNumeroSeccion] = React.useState('');
  const [profesorAsignado, setProfesorAsignado] = React.useState('');
  const [horario, setHorario] = React.useState('');
  const [aula, setAula] = React.useState('');
  const [capacidadMaxima, setCapacidadMaxima] = React.useState('');
  const [estudiantesInscritos, setEstudiantesInscritos] = React.useState('');
  const [estado, setEstado] = React.useState<'Activa' | 'Inactiva' | 'Suspendida'>('Activa');

  React.useEffect(() => {
    if (seccionData?.seccion) {
      const { seccion } = seccionData;
      setNumeroSeccion(seccion.numeroSeccion);
      setProfesorAsignado(seccion.profesorAsignado);
      setHorario(seccion.horario);
      setAula(seccion.aula);
      setCapacidadMaxima(seccion.capacidadMaxima.toString());
      setEstudiantesInscritos(seccion.estudiantesInscritos.toString());
      setEstado(seccion.estado);
    }
  }, [seccionData]);

  const handleSave = () => {
    if (!seccionData?.seccion) return;

    const seccionEditada: Seccion = {
      ...seccionData.seccion,
      numeroSeccion,
      profesorAsignado,
      horario,
      aula,
      capacidadMaxima: parseInt(capacidadMaxima),
      estudiantesInscritos: parseInt(estudiantesInscritos),
      estado
    };

    onSave(seccionEditada);
  };

  if (!seccionData) return null;

  return (
    <>
      <ModalHeader>
        <div>
          <h2 className="text-xl font-bold">Editar Sección {seccionData.seccion.numeroSeccion}</h2>
          <p className="text-sm text-default-500">{seccionData.asignatura.nombre}</p>
        </div>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Número de Sección"
              placeholder="101"
              value={numeroSeccion}
              onValueChange={setNumeroSeccion}
            />
            
            <Select
              label="Estado"
              selectedKeys={[estado]}
              onSelectionChange={(keys) => setEstado(Array.from(keys)[0] as 'Activa' | 'Inactiva' | 'Suspendida')}
            >
              <SelectItem key="Activa">Activa</SelectItem>
              <SelectItem key="Inactiva">Inactiva</SelectItem>
              <SelectItem key="Suspendida">Suspendida</SelectItem>
            </Select>
          </div>

          <Select
            label="Profesor Asignado"
            selectedKeys={profesorAsignado ? [profesorAsignado] : []}
            onSelectionChange={(keys) => setProfesorAsignado(Array.from(keys)[0] as string)}
          >
            {profesores.map((profesor) => (
              <SelectItem key={profesor.nombre}>
                {profesor.nombre} - {profesor.especialidad}
              </SelectItem>
            ))}
          </Select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Horario"
              placeholder="Lun-Mie 08:00-10:00"
              value={horario}
              onValueChange={setHorario}
            />
            
            <Input
              label="Aula"
              placeholder="Lab Panadería A"
              value={aula}
              onValueChange={setAula}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Capacidad Máxima"
              placeholder="20"
              value={capacidadMaxima}
              onValueChange={setCapacidadMaxima}
              min="1"
            />
            
            <Input
              type="number"
              label="Estudiantes Inscritos"
              placeholder="18"
              value={estudiantesInscritos}
              onValueChange={setEstudiantesInscritos}
              min="0"
              max={capacidadMaxima}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onPress={onClose}>
          Cancelar
        </Button>
        <Button color="primary" onPress={handleSave}>
          Guardar Cambios
        </Button>
      </ModalFooter>
    </>
  );
};

export default GestionAsignaturasPage;