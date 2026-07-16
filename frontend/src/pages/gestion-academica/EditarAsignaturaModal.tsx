import React from 'react';
import { Button, Input, ModalBody, ModalFooter, ModalHeader, Select, SelectItem, Textarea } from '@heroui/react';
import { logger } from '../../utils/logger';
import { IAsignatura } from '../../types/academica/asignatura.types';
import { obtenerUsuariosGestoresAsignaturaService } from '../../services/usuario/usuario-service';

interface EditarAsignaturaModalProps {
  asignatura: IAsignatura | null;
  onClose: () => void;
  onSave: (asignatura: Partial<IAsignatura>) => void;
  onCrear: (data: any) => void;
}

const EditarAsignaturaModal: React.FC<EditarAsignaturaModalProps> = ({
  asignatura,
  onClose,
  onSave,
  onCrear
}) => {
  const [codigo, setCodigo] = React.useState('');
  const [nombre, setNombre] = React.useState('');
  const [profesorACargoId, setProfesorACargoId] = React.useState('');
  const [descripcion, setDescripcion] = React.useState('');
  const [gestores, setGestores] = React.useState<{ idUsuario: number, nombreCompleto: string }[]>([]);
  const [isLoadingGestores, setIsLoadingGestores] = React.useState(false);

  React.useEffect(() => {
    const cargarGestores = async () => {
      try {
        setIsLoadingGestores(true);
        const data = await obtenerUsuariosGestoresAsignaturaService();
        setGestores(data);
      } catch (error) {
        logger.error('Error al cargar gestores:', error);
      } finally {
        setIsLoadingGestores(false);
      }
    };
    cargarGestores();
  }, []);

  React.useEffect(() => {
    if (asignatura) {
      setCodigo(asignatura.codigo);
      setNombre(asignatura.nombre);
      setProfesorACargoId(asignatura.profesorACargoId);
      setDescripcion(asignatura.descripcion);
    } else {
      setCodigo('');
      setNombre('');
      setProfesorACargoId('');
      setDescripcion('');
    }
  }, [asignatura]);

  const hasChanges = React.useMemo(() => {
    if (!asignatura) return true; // creación siempre habilitada
    return (
      codigo.trim() !== asignatura.codigo.trim() ||
      nombre.trim() !== asignatura.nombre.trim() ||
      profesorACargoId !== asignatura.profesorACargoId ||
      descripcion.trim() !== (asignatura.descripcion ?? '').trim()
    );
  }, [asignatura, codigo, nombre, profesorACargoId, descripcion]);

  const handleSave = () => {
    if (asignatura) {
      onSave({ codigo, nombre, profesorACargoId, descripcion });
    } else {
      const gestorSeleccionado = gestores.find(g => g.idUsuario.toString() === profesorACargoId);
      if (!gestorSeleccionado) return;
      onCrear({ codigo, nombre, profesorACargoId, descripcion });
    }
  };

  const profesorSelectedKeys = profesorACargoId ? [profesorACargoId] : [];

  return (
    <>
      <ModalHeader>
        <h2 className="text-xl font-bold">
          {asignatura ? 'Editar Asignatura' : 'Nueva Asignatura'}
        </h2>
      </ModalHeader>
      <ModalBody className="overflow-y-scroll custom-scrollbar">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Código"
              placeholder="GAS-101"
              value={codigo}
              onValueChange={setCodigo}
              maxLength={50}
              description={`${codigo.length}/50`}
              isRequired
            />
            <Input
              label="Nombre"
              placeholder="Panadería Básica"
              value={nombre}
              onValueChange={setNombre}
              maxLength={100}
              description={`${nombre.length}/100`}
              isRequired
            />
          </div>

          <Select
            label="Gestor Asignatura"
            placeholder={isLoadingGestores ? "Cargando gestores..." : "Seleccione un gestor"}
            selectedKeys={profesorSelectedKeys}
            onSelectionChange={(keys) => setProfesorACargoId(Array.from(keys)[0] as string)}
            description="El gestor de asignatura será quien realice los pedidos para esta asignatura"
            isRequired
            isLoading={isLoadingGestores}
            listboxProps={{ emptyContent: "Sin gestores disponibles. Contacte al administrador." }}
          >
            {gestores.map((gestor) => (
              <SelectItem key={gestor.idUsuario.toString()}>
                {gestor.nombreCompleto}
              </SelectItem>
            ))}
          </Select>

          <Textarea
            label="Descripción"
            placeholder="Fundamentos básicos de panadería..."
            value={descripcion}
            onValueChange={setDescripcion}
            maxLength={250}
            description={`${descripcion.length}/250`}
            minRows={3}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="light" onPress={onClose}>
          Cancelar
        </Button>
        <Button
          color="primary"
          onPress={handleSave}
          isDisabled={!codigo || !nombre || !profesorACargoId || !hasChanges}
        >
          {asignatura ? 'Guardar Cambios' : 'Crear Asignatura'}
        </Button>
      </ModalFooter>
    </>
  );
};

export default EditarAsignaturaModal;
