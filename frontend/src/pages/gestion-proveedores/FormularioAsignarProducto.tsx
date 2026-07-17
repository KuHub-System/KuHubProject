import React from 'react';
import { Button, Input, ModalBody, ModalFooter, ModalHeader, Select, SelectItem, Spinner } from '@heroui/react';
import { Icon } from '@iconify/react';
import { IProductoDisponibleDTO, IProveedorProductoAddDTO } from '../../types/proveedor/proveedor.types';
import { obtenerProductosDisponiblesService, obtenerCategoriasActivasJsonService } from '../../services/proveedor/proveedor-service';
import { parseChileanPrice, formatChileanPrice, smartPriceInput } from './constants';

interface FormularioAsignarProductoProps {
  productos: IProductoDisponibleDTO[];
  idProveedor: number;
  onClose: () => void;
  onSave: (dto: IProveedorProductoAddDTO) => Promise<void | boolean>;
}

const IVA_TASA = 1.19;

const FormularioAsignarProducto: React.FC<FormularioAsignarProductoProps> = ({
  productos: productosInicial,
  idProveedor,
  onClose,
  onSave,
}) => {
  const [searchProd, setSearchProd] = React.useState('');
  const [selectedProducto, setSelectedProducto] = React.useState<IProductoDisponibleDTO | null>(null);
  const [marcaProducto, setMarcaProducto] = React.useState('');
  const [formatoContenido, setFormatoContenido] = React.useState('');
  const [precioNeto, setPrecioNeto] = React.useState('');
  const [precioConIva, setPrecioConIva] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Recalcula Precio + IVA siempre que Neto tenga un valor válido
  const handlePrecioNetoBlur = () => {
    const neto = parseChileanPrice(precioNeto);
    if (!isNaN(neto) && neto > 0) {
      setPrecioConIva(formatChileanPrice(neto * IVA_TASA));
    }
  };

  // Recalcula Precio Neto siempre que Precio + IVA tenga un valor válido
  const handlePrecioConIvaBlur = () => {
    const conIva = parseChileanPrice(precioConIva);
    if (!isNaN(conIva) && conIva > 0) {
      setPrecioNeto(formatChileanPrice(conIva / IVA_TASA));
    }
  };
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<Set<string>>(new Set());
  const [loadingProductos, setLoadingProductos] = React.useState(false);
  const [productos, setProductos] = React.useState<IProductoDisponibleDTO[]>(productosInicial || []);
  const [categorias, setCategorias] = React.useState<Array<{ id: string; nombre: string }>>([
    { id: 'todas', nombre: 'Todas las categorías' },
  ]);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cargar categorías activas del backend al montar el componente
  React.useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const cats = await obtenerCategoriasActivasJsonService();
        const categoriasFormato = cats.map(c => ({ id: c.id.toString(), nombre: c.nombre }));
        setCategorias([{ id: 'todas', nombre: 'Todas las categorías' }, ...categoriasFormato]);
      } catch {
        // Mantener categorías por defecto si hay error
      }
    };
    cargarCategorias();
  }, []);

  // Manejar cambio de múltiples categorías y filtrar
  const handleCategoryChange = React.useCallback(async (keys: any) => {
    const newSelectedIds = new Set(
      Array.from(keys)
        .map(key => String(key))
        .filter((key: string) => key !== 'todas')
    );
    setSelectedCategoryIds(newSelectedIds);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Si no hay categorías seleccionadas, mostrar todos los productos
    if (newSelectedIds.size === 0) {
      setLoadingProductos(true);
      try {
        const data = await obtenerProductosDisponiblesService(idProveedor);
        setProductos(data);
      } catch {
        // Mantener los productos anteriores si hay error
      } finally {
        setLoadingProductos(false);
      }
      return;
    }

    // Con debounce de 2 segundos para múltiples selecciones
    debounceRef.current = setTimeout(async () => {
      setLoadingProductos(true);
      try {
        // Obtener productos para la primera categoría seleccionada
        // (el backend filtra por una sola categoría)
        const firstCategoryId = Array.from(newSelectedIds)[0];
        const idCat = parseInt(firstCategoryId, 10);
        const data = await obtenerProductosDisponiblesService(idProveedor, idCat as any);
        setProductos(data);
      } catch {
        // Mantener los productos anteriores si hay error
      } finally {
        setLoadingProductos(false);
      }
    }, 2000);
  }, [idProveedor]);

  const productosFiltrados = React.useMemo(() => {
    let filtered = productos;

    // Filtrar por búsqueda
    if (searchProd.trim()) {
      const term = searchProd.toLowerCase();
      filtered = filtered.filter((p) => p.nombreProducto.toLowerCase().includes(term));
    }

    return filtered;
  }, [searchProd, productos]);

  const handleSubmit = async () => {
    setError(null);
    if (!selectedProducto) {
      setError('Selecciona un producto');
      return;
    }
    if (!precioNeto.trim() && !precioConIva.trim()) {
      setError('Ingresa al menos uno de los precios: Precio Neto o Precio + IVA');
      return;
    }
    setSaving(true);
    try {
      const dto: IProveedorProductoAddDTO = {
        idProducto: selectedProducto.idProducto,
        marcaProducto: marcaProducto.trim() || undefined,
        formatoContenido: formatoContenido.trim() || undefined,
        precioNeto: precioNeto.trim() || undefined,
        precioConIva: precioConIva.trim() || undefined,
      };
      await onSave(dto);
      setSelectedProducto(null);
      setMarcaProducto('');
      setFormatoContenido('');
      setPrecioNeto('');
      setPrecioConIva('');
      setSearchProd('');
    } catch (err: any) {
      setError(err.message || 'Error al asignar el producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalHeader className="border-b border-default-100 bg-success-50 dark:bg-success-50/10">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:package-plus" className="text-success" width={20} />
          <span className="font-bold text-success dark:text-foreground">Asignar Producto</span>
        </div>
      </ModalHeader>

      <ModalBody className="gap-3 py-4 overflow-y-scroll custom-scrollbar">
        {error && (
          <div className="flex items-center gap-2 bg-danger-50 dark:bg-danger-50/10 text-danger text-sm p-3 rounded-lg">
            <Icon icon="lucide:alert-circle" width={16} />
            {error}
          </div>
        )}

        <Input
          label="Buscar producto"
          placeholder="Nombre o código..."
          value={searchProd}
          onValueChange={setSearchProd}
          startContent={<Icon icon="lucide:search" className="text-default-400" width={15} />}
          variant="bordered"
          isClearable
          onClear={() => setSearchProd('')}
        />

        {/* Selector de Categorías (Múltiples) */}
        <Select
          label="Categorías"
          placeholder="Seleccione una o más categorías..."
          selectedKeys={selectedCategoryIds}
          onSelectionChange={handleCategoryChange}
          variant="bordered"
          selectionMode="multiple"
          isDisabled={loadingProductos}
          startContent={<Icon icon="lucide:tag" className="text-default-400" width={16} />}
          endContent={loadingProductos && <Spinner size="sm" color="warning" />}
          description={selectedCategoryIds.size > 0 ? `${selectedCategoryIds.size} categoría(s) seleccionada(s)` : undefined}
        >
          {categorias.map((cat) => (
            <SelectItem key={cat.id}>
              {cat.nombre}
            </SelectItem>
          ))}
        </Select>

        {/* Lista de productos */}
        <div className="max-h-52 overflow-y-auto border border-default-200 rounded-lg divide-y divide-default-100">
          {loadingProductos ? (
            <div className="flex justify-center items-center py-8">
              <Spinner size="sm" color="warning" label="Cargando productos..." />
            </div>
          ) : productosFiltrados.length === 0 ? (
            <p className="text-xs text-default-400 text-center py-6">Sin resultados</p>
          ) : (
            productosFiltrados.map((p) => (
              <button
                key={p.idProducto}
                type="button"
                onClick={() => setSelectedProducto(p)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-primary-50 dark:hover:bg-primary-50/10 transition-colors ${
                  selectedProducto?.idProducto === p.idProducto
                    ? 'bg-primary-100 dark:bg-primary-100/20 font-semibold'
                    : ''
                }`}
              >
                <span className="font-medium">{p.nombreProducto}</span>
                <span className="text-default-400 ml-1">— {p.abreviatura}</span>
              </button>
            ))
          )}
        </div>

        {selectedProducto && (
          <div className="bg-primary-50 dark:bg-primary-50/10 rounded-lg px-3 py-2 text-xs text-primary-700 dark:text-primary-300 flex items-center gap-2">
            <Icon icon="lucide:check-circle" width={14} />
            Seleccionado: <strong>{selectedProducto.nombreProducto}</strong>
          </div>
        )}

        <Input
          label="Marca"
          placeholder="Sin marca"
          value={marcaProducto}
          onValueChange={setMarcaProducto}
          variant="bordered"
          type="text"
        />

        <Input
          label="Formato / Contenido"
          placeholder="Ej: 1 kg, 500 ml, 6 un."
          value={formatoContenido}
          onValueChange={setFormatoContenido}
          variant="bordered"
          type="text"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Precio Neto"
            placeholder="Ej: 1.234"
            value={precioNeto}
            onValueChange={(value) => setPrecioNeto(smartPriceInput(value))}
            onBlur={handlePrecioNetoBlur}
            variant="bordered"
            type="text"
            startContent={<span className="text-default-400 text-sm">$</span>}
            description="IVA 19 % aplicado automáticamente"
          />
          <Input
            label="Precio + IVA"
            placeholder="Ej: 1.468,46"
            value={precioConIva}
            onValueChange={(value) => setPrecioConIva(smartPriceInput(value))}
            onBlur={handlePrecioConIvaBlur}
            variant="bordered"
            type="text"
            startContent={<span className="text-default-400 text-sm">$</span>}
            description="Neto derivado automáticamente"
          />
        </div>
      </ModalBody>

      <ModalFooter className="bg-gradient-to-r from-default-50 to-default-50 dark:from-content2 dark:to-content2 border-t border-default-200 dark:border-default-100 gap-2 px-6 py-4">
        <Button variant="ghost" onPress={onClose} className="font-medium">
          Cancelar
        </Button>
        <Button
          color="success"
          variant="solid"
          onPress={handleSubmit}
          isLoading={saving}
          startContent={!saving && <Icon icon="lucide:plus" width={16} />}
          className="font-bold text-secondary shadow-md cursor-pointer"
          size="lg"
        >
          Asignar Producto
        </Button>
      </ModalFooter>
    </>
  );
};

export default FormularioAsignarProducto;
