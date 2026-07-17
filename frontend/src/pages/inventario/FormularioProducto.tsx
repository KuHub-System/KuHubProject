import React from 'react';
import { Input, Button, Select, SelectItem, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmtCL } from '../../utils/format-numbers';
import { IInventoryPageItem, IProducto } from '../../types/inventario/producto.types';
import { crearProductoService, actualizarProductoService } from '../../services/inventario/producto-service';
import { useToast } from '../../hooks/useToast';
import ConfirmarDisponibleBodegaModal from '../../components/modals/ConfirmarDisponibleBodegaModal';
import ConfirmarSalidaDisponibleModal, { ConfirmarSalidaDisponibleItem } from '../../components/modals/ConfirmarSalidaDisponibleModal';
import { IUnidadMedida } from '../../types/inventario/inventario.types';
import { actualizarBodegaTransitoConProductoService, crearBodegaConProductoService, WarehouseWithProductUpdateDTO, IBodegaStockSyncWarning, IBodegaStockInsuficiente } from '../../services/inventario/bodega-transito-service';
import { registrarDisponiblesService, consultarDisponiblesPorProductoService, restarDisponiblesService } from '../../services/solicitud/solicitud-service';

interface FormularioProductoProps {
  producto: IProducto | null;
  onClose: () => void;
  mode: 'crear' | 'editar';
  categorias: { id: number; nombre: string }[];
  unidades: IUnidadMedida[];
  onConflictSync?: (producto: IProducto) => void;
  origenContext?: 'inventario' | 'bodega';
  puedeEditarDatos?: boolean;
}

/**
 * Componente de formulario para crear o editar un producto.
 * 
 * @param {FormularioProductoProps} props - Propiedades del componente.
 * @returns {JSX.Element} El formulario de producto.
 */
const FormularioProducto: React.FC<FormularioProductoProps> = ({ producto, onClose, mode, categorias, unidades, onConflictSync, origenContext = 'inventario', puedeEditarDatos = true }) => {
  const toast = useToast();
  const [nombre, setNombre] = React.useState(producto?.nombre || '');
  const [codProducto, setCodProducto] = React.useState((producto as any)?.codProducto || '');
  const [descripcion, setDescripcion] = React.useState(producto?.descripcion || '');
  const [idCategoria, setIdCategoria] = React.useState<string>(() => {
    if (producto?.categoria) {
      const cat = categorias.find(c => c.nombre === producto.categoria);
      return cat ? cat.id.toString() : '';
    }
    return '';
  });
  const [idUnidadMedida, setIdUnidadMedida] = React.useState<string>(() => {
    if (producto?.unidadMedida) {
      const uni = unidades.find(u => u.nombre === producto.unidadMedida);
      return uni ? uni.id.toString() : '';
    }
    return '';
  });
  const [stock, setStock] = React.useState(producto?.stock?.toString() || '0');
  const [stockMinimo, setStockMinimo] = React.useState(producto?.stockMinimo?.toString() || '0');
  const [tipoMovimiento, setTipoMovimiento] = React.useState('');
  const [deltaInput, setDeltaInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [mostrarAbreviatura, setMostrarAbreviatura] = React.useState(false);
  const [editandoDatosBasicos, setEditandoDatosBasicos] = React.useState(mode === 'crear');

  // Determinar si la unidad actual es fraccionaria
  const esUnidadFraccionaria = React.useMemo(() => {
    if (!idUnidadMedida) return true; // Por defecto permitir decimales si no hay unidad
    const uni = unidades.find(u => u.id.toString() === idUnidadMedida);
    return uni ? uni.esFraccionario : true;
  }, [idUnidadMedida, unidades]);

  // Limpiar decimales si se cambia a una unidad no fraccionaria
  React.useEffect(() => {
    if (!esUnidadFraccionaria) {
      const limpiarDecimales = (val: string) => {
        if (!val) return '0';
        const num = parseFloat(val);
        return isNaN(num) ? '0' : Math.floor(num).toString();
      };

      const newStock = limpiarDecimales(stock);
      const newStockMin = limpiarDecimales(stockMinimo);

      if (newStock !== stock) setStock(newStock);
      if (newStockMin !== stockMinimo) setStockMinimo(newStockMin);
    }
  }, [esUnidadFraccionaria, stock, stockMinimo]);

  // Reset delta when motivo changes; for AJUSTE pre-fill with current stock
  React.useEffect(() => {
    if (tipoMovimiento === 'AJUSTE_INVENTARIO') {
      setDeltaInput(producto?.stock?.toString() || '0');
    } else {
      setDeltaInput('');
    }
  }, [tipoMovimiento, producto?.stock]);

  // Estado local para el producto de referencia (usado para validaciones de stock y cambios)
  // Se inicializa con el prop 'producto' pero puede actualizarse en caso de conflicto (409)
  const [productoReferencia, setProductoReferencia] = React.useState<IProducto | null>(producto);

  // Caso 1 bodega: confirmación para registrar una ENTRADA como stock disponible.
  const [isDisponibleBodegaOpen, setIsDisponibleBodegaOpen] = React.useState(false);

  // Caso 1 bodega: confirmación para descontar disponible al registrar una SALIDA.
  const [isSalidaDisponibleBodegaOpen, setIsSalidaDisponibleBodegaOpen] = React.useState(false);
  const [salidaDisponibleBodega, setSalidaDisponibleBodega] = React.useState<ConfirmarSalidaDisponibleItem | null>(null);

  const handleSubmit = async () => {
    // Validaciones
    if (!nombre.trim()) {
      toast.warning('El nombre del producto es requerido');
      return;
    }
    if (!idCategoria) {
      toast.warning('La categoría es requerida');
      return;
    }
    if (!idUnidadMedida) {
      toast.warning('La unidad de medida es requerida');
      return;
    }

    const stockNum = parseFloat(stock);
    const stockMinNum = parseFloat(stockMinimo);

    if (isNaN(stockNum)) {
      toast.warning('El stock es requerido y debe ser un número');
      return;
    }
    if (stockNum < 0) {
      toast.warning('El stock no puede ser negativo');
      return;
    }
    if (!isNaN(stockMinNum) && stockMinNum < 0) {
      toast.warning('El stock mínimo no puede ser negativo');
      return;
    }
    const originalStockRef = parseFloat(productoReferencia?.stock?.toString() || '0');
    if (mode === 'editar' && !tipoMovimiento && stockNum !== originalStockRef) {
      toast.warning('El motivo (Tipo de Movimiento) es requerido para cambiar el stock');
      return;
    }

    // Caso 1: una ENTRADA a bodega de tránsito con cantidad > 0 puede registrarse
    // también como stock disponible. Se pregunta antes de guardar.
    const deltaEntradaBodega = parseFloat(deltaInput);
    const esEntradaBodegaDisponible =
      origenContext === 'bodega' && mode === 'editar' &&
      tipoMovimiento === 'ENTRADA_BODEGA' && !isNaN(deltaEntradaBodega) && deltaEntradaBodega > 0;
    if (esEntradaBodegaDisponible) {
      setIsDisponibleBodegaOpen(true);
      return;
    }

    // Caso 1 salida: una SALIDA/MERMA/DEVOLUCIÓN a bodega cuyo producto tiene disponible
    // registrado abre el modal para confirmar el descuento del sobrante.
    const MOTIVOS_SALIDA_BODEGA = ['SALIDA_BODEGA', 'MERMA_BODEGA', 'DEVOLUCION'];
    const esSalidaBodega =
      origenContext === 'bodega' && mode === 'editar' && !!producto &&
      !!tipoMovimiento && MOTIVOS_SALIDA_BODEGA.includes(tipoMovimiento) &&
      !isNaN(deltaEntradaBodega) && deltaEntradaBodega > 0;
    if (esSalidaBodega && producto) {
      try {
        const idProd = parseInt(producto.id);
        const map = await consultarDisponiblesPorProductoService([idProd], 'BODEGA_TRANSITO');
        const disponible = map[idProd] ?? 0;
        if (disponible > 0.001) {
          setSalidaDisponibleBodega({
            idProducto: idProd,
            nombreProducto: nombre.trim() || producto.nombre || '',
            unidad: producto.unidadMedida,
            cantidadSalida: deltaEntradaBodega,
            disponible: parseFloat(disponible.toFixed(3)),
            aDescontar: parseFloat(Math.min(deltaEntradaBodega, disponible).toFixed(3)),
          });
          setIsSalidaDisponibleBodegaOpen(true);
          return;
        }
      } catch {
        // Si falla la consulta no bloqueamos la salida; se guarda sin descontar.
      }
    }

    await ejecutarGuardado(false);
  };

  const ejecutarGuardado = async (
    registrarDisponible: boolean,
    restarDisponible?: { cantidad: number; disponibleEnVista: number },
  ) => {
    try {
      setIsLoading(true);

      if (mode === 'crear') {
        if (origenContext === 'bodega') {
          // Crear nuevo producto directamente en bodega de tránsito
          await crearBodegaConProductoService({
            nombreProducto: nombre.trim(),
            codigoProducto: codProducto.trim() || undefined,
            descripcionProducto: descripcion.trim(),
            idCategoria: parseInt(idCategoria),
            idUnidadMedida: parseInt(idUnidadMedida),
            stock: parseFloat(stock) || 0,
            stockLimit: parseFloat(stockMinimo) || 0,
          });
          window.dispatchEvent(new Event('productosActualizados'));
          toast.success('Producto creado en bodega de tránsito exitosamente');
        } else {
          // Crear nuevo producto en inventario
          const datosProducto = {
            nombre: nombre.trim(),
            codProducto: codProducto.trim() || undefined,
            descripcion: descripcion.trim(),
            idCategoria: parseInt(idCategoria),
            idUnidadMedida: parseInt(idUnidadMedida),
            stock: parseFloat(stock) || 0,
            stockMinimo: parseFloat(stockMinimo) || 0,
          };

          await crearProductoService(datosProducto);
          toast.success('Producto creado exitosamente');
        }
      } else {
        // Actualizar producto existente usando el servicio
        if (!producto?.id) {
          throw new Error('ID de producto no encontrado');
        }

        const catNombre = categorias.find(c => c.id.toString() === idCategoria)?.nombre || '';
        const uniNombre = unidades.find(u => u.id.toString() === idUnidadMedida)?.nombre || '';

        const stockActualizado = parseFloat(stock) || 0;
        const stockCambiado = (producto?.stock ?? 0) !== stockActualizado;

        if (origenContext === 'bodega') {
          // --- LÓGICA BODEGA: PATCH con delta (igual que inventario) ---
          const originalStockRef = parseFloat(productoReferencia?.stock?.toString() || '0');
          const deltaInputVal = parseFloat(deltaInput);
          const hayMovBodega = tipoMovimiento && !isNaN(deltaInputVal) && deltaInputVal > 0;
          const datosBodega: WarehouseWithProductUpdateDTO = {
            idBodegaTransito: (producto as any)._idBodegaTransito || 0,
            idInventario: producto._idInventario || 0,
            idProducto: parseInt(producto.id),
            tipoMovimiento: hayMovBodega ? tipoMovimiento : null,
            nombreProducto: nombre.trim(),
            codigoProducto: codProducto.trim() || undefined,
            descripcionProducto: descripcion.trim(),
            idCategoria: parseInt(idCategoria),
            idUnidadMedida: parseInt(idUnidadMedida),
            stock: originalStockRef,
            stockLimit: parseFloat(stockMinimo) || 0,
            delta: hayMovBodega ? deltaInputVal : null,
            stockEnVista: originalStockRef,
          };

          const resultadoBodega = await actualizarBodegaTransitoConProductoService(datosBodega);

          // 422: stock insuficiente — NO cerrar, actualizar stock en modal
          if ('insuficiente' in resultadoBodega && resultadoBodega.insuficiente === true) {
            const insuf = resultadoBodega as IBodegaStockInsuficiente;
            toast.error(insuf.warning);
            const realStock = insuf.item.stock;
            setProductoReferencia(prev => prev ? { ...prev, stock: realStock } : prev);
            if (onConflictSync) {
              onConflictSync({ ...producto, stock: realStock } as IProducto);
            }
            setDeltaInput('');
            return;
          }

          // 409: desincronizado pero guardado — cerrar + toast warning
          if ('desync' in resultadoBodega && resultadoBodega.desync === true) {
            const sync = resultadoBodega as IBodegaStockSyncWarning;
            if (onConflictSync) {
              onConflictSync({ ...producto, stock: sync.item.stock } as IProducto);
            }
            toast.warning(sync.warning, { duration: 20000 });
          } else {
            toast.success('Cambios guardados exitosamente en la bodega');
          }

          // Caso 1: registrar la entrada como stock disponible de bodega de tránsito.
          if (registrarDisponible && hayMovBodega) {
            try {
              await registrarDisponiblesService([{
                idProducto: parseInt(producto.id),
                cantidad: deltaInputVal,
                tipoDisponible: 'BODEGA_TRANSITO',
              }]);
              toast.success('Producto registrado como stock disponible de bodega de tránsito');
            } catch {
              toast.warning('La entrada se guardó, pero no se pudo registrar como stock disponible');
            }
          }

          // Caso 1 salida: descontar el sobrante del stock disponible (la salida ya se procesó).
          if (restarDisponible && hayMovBodega) {
            try {
              const res = await restarDisponiblesService([{
                idProducto: parseInt(producto.id),
                cantidad: restarDisponible.cantidad,
                disponibleEnVista: restarDisponible.disponibleEnVista,
                tipoDisponible: 'BODEGA_TRANSITO',
              }]);
              const r = res.resultados[0];
              if (r?.estado === 'INSUFICIENTE') {
                toast.warning(`Un proceso en paralelo dejó el stock disponible en ${r.disponibleReal}, por debajo de lo que se iba a descontar; no se descontó el sobrante. La salida se realizó igualmente.`, { duration: 20000 });
              } else if (r?.estado === 'SINCRONIZADO') {
                toast.warning('El stock disponible cambió por un proceso en paralelo; se sincronizó automáticamente.', { duration: 12000 });
              } else {
                toast.success('Stock disponible descontado correctamente');
              }
            } catch {
              toast.warning('La salida se guardó, pero no se pudo descontar el stock disponible');
            }
          }
        } else {
          // --- LÓGICA INVENTARIO: PATCH con delta ---
          const originalStockRef = parseFloat(productoReferencia?.stock?.toString() || '0');
          const isAjusteMode = tipoMovimiento === 'AJUSTE_INVENTARIO';
          const deltaInputVal = parseFloat(deltaInput);

          let deltaFinal = 0;
          let ajustePositivoVal: boolean | null = null;

          if (tipoMovimiento) {
            if (isAjusteMode) {
              deltaFinal = Math.abs(deltaInputVal - originalStockRef);
              ajustePositivoVal = deltaInputVal > originalStockRef;
            } else {
              deltaFinal = deltaInputVal;
            }
          }

          const datosActualizacion = {
            id: producto.id,
            idInventario: producto._idInventario || 0,
            nombre: nombre.trim(),
            codProducto: codProducto.trim() || undefined,
            descripcion: descripcion.trim(),
            categoria: catNombre,
            unidadMedida: uniNombre,
            idCategoria: parseInt(idCategoria),
            idUnidadMedida: parseInt(idUnidadMedida),
            stock: originalStockRef,
            stockMinimo: parseFloat(stockMinimo) || 0,
            tipoMovimiento: tipoMovimiento,
            stockEnVista: originalStockRef,
            delta: deltaFinal,
            ajustePositivo: ajustePositivoVal,
          };

          const resultado = await actualizarProductoService(datosActualizacion);

          // 422: stock insuficiente con desync — mostrar error, actualizar stock en modal, NO cerrar
          if ('insuficiente' in resultado && resultado.insuficiente === true) {
            const insuf = resultado as any;
            toast.error(insuf.warning);
            const realStock = insuf.item.stockActual ?? ('stock' in insuf.item ? insuf.item.stock : undefined);
            setProductoReferencia(prev => prev ? { ...prev, stock: realStock } : prev);
            if (onConflictSync && realStock !== undefined) {
              onConflictSync({
                ...producto,
                stock: realStock,
                stockMinimo: insuf.item.stockMinimo ?? ('stockLimit' in insuf.item ? insuf.item.stockLimit : producto.stockMinimo),
                _idInventario: insuf.item.idInventario ?? ('_idInventario' in producto ? producto._idInventario : undefined),
              } as IProducto);
            }
            setDeltaInput('');
            return;
          }

          // Determinar si fue desync (409 operativo) o éxito limpio (200)
          let itemActualizado: IInventoryPageItem;
          if ('desync' in resultado && resultado.desync === true) {
            itemActualizado = (resultado as any).item;
          } else if ('insuficiente' in resultado && resultado.insuficiente === true) {
            itemActualizado = (resultado as any).item;
          } else {
            itemActualizado = resultado as any;
          }

          // Sync the item in the parent list
          if (onConflictSync && itemActualizado) {
            const syncedProducto: IProducto = {
              id: itemActualizado.producto?.idProducto?.toString() ?? producto.id,
              nombre: itemActualizado.producto?.nombre ?? nombre.trim(),
              descripcion: itemActualizado.producto?.descripcionProducto ?? '',
              codProducto: itemActualizado.producto?.codProducto,
              categoria: itemActualizado.producto?.categoria?.nombre ?? catNombre,
              unidadMedida: itemActualizado.producto?.unidad?.nombre ?? uniNombre,
              stock: itemActualizado.stockActual ?? ('stock' in itemActualizado ? itemActualizado.stock : originalStockRef),
              stockMinimo: itemActualizado.stockMinimo ?? (parseFloat(stockMinimo) || 0),
              fechaCreacion: new Date().toISOString(),
              fechaActualizacion: new Date().toISOString(),
              _idInventario: itemActualizado.idInventario,
            } as IProducto;
            onConflictSync(syncedProducto);
          }

          if ('desync' in resultado && resultado.desync === true) {
            if ('warning' in resultado) {
              toast.warning(((resultado as any).warning || 'Stock desincronizado'), { duration: 20000 });
            }
          } else {
            toast.success('Cambios guardados exitosamente');
          }
        }
      }

      // Despachar evento personalizado para notificar el cambio
      window.dispatchEvent(new Event('productosActualizados'));

      onClose();
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar el producto';

      if (error.status === 410) {
        toast.error(errorMessage, 'Operación cancelada');
        window.dispatchEvent(new Event('productosActualizados'));
        onClose();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = React.useMemo(() => {
    if (mode === 'crear') return true;
    if (!productoReferencia) return false;

    const originalCategoria = productoReferencia.categoria ? categorias.find(c => c.nombre === productoReferencia.categoria)?.id.toString() || '' : '';
    const originalUnidad = productoReferencia.unidadMedida ? unidades.find(u => u.nombre === productoReferencia.unidadMedida)?.id.toString() || '' : '';
    const originalCodProducto = (productoReferencia as any).codProducto || '';
    const originalDescripcion = productoReferencia.descripcion || '';
    const originalStock = productoReferencia.stock?.toString() || '0';
    const originalStockMinimo = productoReferencia.stockMinimo?.toString() || '0';

    const stockChanged = tipoMovimiento !== '' && deltaInput !== '';

    return (
      nombre.trim() !== (productoReferencia.nombre || '') ||
      codProducto.trim() !== originalCodProducto ||
      descripcion.trim() !== originalDescripcion ||
      idCategoria !== originalCategoria ||
      idUnidadMedida !== originalUnidad ||
      stockChanged ||
      stockMinimo.trim() !== originalStockMinimo
    );
  }, [mode, productoReferencia, nombre, codProducto, descripcion, idCategoria, idUnidadMedida, stock, stockMinimo, tipoMovimiento, deltaInput, categorias, unidades]);

  // Validaciones de lógica de Stock vs Motivo
  const originalStockVal = parseFloat(productoReferencia?.stock?.toString() || '0');
  const currentStockVal = parseFloat(stock); // used in create mode

  // Delta-based logic for edit mode (inventario + bodega)
  const isAjusteEdit = tipoMovimiento === 'AJUSTE_INVENTARIO' || tipoMovimiento === 'AJUSTE_BODEGA';
  const esSalidaEdit = ['SALIDA_INVENTARIO', 'TRASLADO', 'MERMA_INVENTARIO', 'SALIDA_BODEGA', 'MERMA_BODEGA', 'DEVOLUCION'].includes(tipoMovimiento);
  const deltaVal = parseFloat(deltaInput);
  const stockFinal = isAjusteEdit
    ? (deltaInput === '' ? originalStockVal : deltaVal)
    : esSalidaEdit
      ? originalStockVal - (isNaN(deltaVal) ? 0 : deltaVal)
      : originalStockVal + (isNaN(deltaVal) ? 0 : deltaVal);

  let deltaError = '';
  if (mode === 'editar' && tipoMovimiento && deltaInput !== '') {
    if (isAjusteEdit) {
      if (isNaN(deltaVal) || deltaVal < 0) deltaError = 'El nuevo stock no puede ser negativo';
      else if (deltaVal === originalStockVal) deltaError = 'El nuevo stock es igual al actual, sin cambios';
    } else {
      if (isNaN(deltaVal) || deltaVal <= 0) deltaError = 'La cantidad debe ser mayor a 0';
      else if (esSalidaEdit && stockFinal < 0) deltaError = `Stock insuficiente (actual: ${fmtCL(originalStockVal)})`;
    }
  }

  let stockError = '';
  let diffText = '';

  const motivoDescripcion = React.useMemo(() => {
    switch (tipoMovimiento) {
      case 'ENTRADA_INVENTARIO': return "Entrada de insumos al inventario";
      case 'ENTRADA_BODEGA': return "Entrada de insumos a la bodega de tránsito";
      case 'SALIDA_INVENTARIO':
      case 'SALIDA_BODEGA':
        return origenContext === 'bodega'
          ? "Salida de insumos de la bodega de tránsito"
          : "Salida de insumos del inventario";
      case 'TRASLADO':
        return origenContext === 'bodega'
          ? "Mover de regreso al inventario principal"
          : "Mover hacia la bodega de tránsito";
      case 'DEVOLUCION':
        return "Registrar devolución de insumos al inventario";
      case 'AJUSTE_INVENTARIO':
      case 'AJUSTE_BODEGA': return "Ajustar stock actual";
      case 'MERMA_INVENTARIO':
      case 'MERMA_BODEGA': return "Salida de insumos por daño/pérdida";
      default: return "";
    }
  }, [tipoMovimiento, origenContext]);

  const motivoLabel: Record<string, string> = {
    ENTRADA_INVENTARIO: 'Entrada', ENTRADA_BODEGA: 'Entrada',
    SALIDA_INVENTARIO: 'Salida', SALIDA_BODEGA: 'Salida',
    TRASLADO: 'Traslado', DEVOLUCION: 'Devolución',
    AJUSTE_INVENTARIO: 'Ajuste', AJUSTE_BODEGA: 'Ajuste',
    MERMA_INVENTARIO: 'Merma', MERMA_BODEGA: 'Merma',
  };

  const isFormInvalid =
    !nombre.trim() ||
    !idCategoria ||
    !idUnidadMedida ||
    (mode === 'crear' && (!stock.trim() || isNaN(parseFloat(stock)) || parseFloat(stock) < 0)) ||
    (mode === 'editar' && tipoMovimiento !== '' && (deltaInput === '' || !!deltaError)) ||
    (stockMinimo.trim() !== '' && (isNaN(parseFloat(stockMinimo)) || parseFloat(stockMinimo) < 0)) ||
    !hasChanges;

  return (
    <div className="space-y-4">
      {mode === 'editar' && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-default-600 font-bold">
            <Icon icon="lucide:package-2" width={20} />
            <span>Datos del Producto</span>
          </div>
          {puedeEditarDatos && (
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              color="warning"
              onPress={() => setEditandoDatosBasicos(!editandoDatosBasicos)}
              title={editandoDatosBasicos ? "Cerrar campos" : "Habilitar edición de campos básicos"}
              className="shadow-sm"
            >
              <Icon icon={editandoDatosBasicos ? "lucide:lock" : "lucide:edit-2"} width={16} />
            </Button>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {(mode === 'crear' || editandoDatosBasicos) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 overflow-hidden"
          >
            <Input
              label="Nombre"
              placeholder="Nombre del producto"
              value={nombre}
              onValueChange={setNombre}
              isRequired
              variant="bordered"
              maxLength={100}
              description={`${nombre.length}/100`}
              isDisabled={!editandoDatosBasicos && mode !== 'crear'}
              classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
            />

            <Input
              label="Código de producto (Opcional)"
              placeholder="Ej: PRD-001"
              value={codProducto}
              onValueChange={setCodProducto}
              variant="bordered"
              maxLength={25}
              description={`${codProducto.length}/25`}
              isDisabled={!editandoDatosBasicos && mode !== 'crear'}
              classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
            />

            <Input
              label="Descripción (Opcional)"
              placeholder="Descripción del producto"
              value={descripcion}
              onValueChange={setDescripcion}
              variant="bordered"
              maxLength={100}
              description={`${descripcion.length}/100`}
              isDisabled={!editandoDatosBasicos && mode !== 'crear'}
              classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Categoría"
                placeholder="Seleccione..."
                selectedKeys={idCategoria ? [idCategoria] : []}
                onChange={(e: any) => setIdCategoria(e.target.value)}
                isRequired
                variant="bordered"
                isDisabled={!editandoDatosBasicos && mode !== 'crear'}
                classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
              >
                {categorias.map(cat => (
                  <SelectItem key={cat.id.toString()}>{cat.nombre}</SelectItem>
                ))}
              </Select>

              <div className="relative">
                <Select
                  label="Unidad de Medida"
                  placeholder="Seleccione..."
                  selectedKeys={idUnidadMedida ? [idUnidadMedida] : []}
                  onChange={(e: any) => setIdUnidadMedida(e.target.value)}
                  isRequired
                  variant="bordered"
                  isDisabled={!editandoDatosBasicos && mode !== 'crear'}
                  classNames={{ trigger: "bg-white dark:bg-default-100/50 pr-10" }}
                >
                  {unidades.map(uni => (
                    <SelectItem key={uni.id.toString()}>
                      {mostrarAbreviatura ? uni.abreviatura : uni.nombre}
                    </SelectItem>
                  ))}
                </Select>
                <div className="absolute right-10 top-1/2 -translate-y-1/2 z-10">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setMostrarAbreviatura(!mostrarAbreviatura)}
                    className="text-default-400 hover:text-primary min-w-unit-6 h-6"
                    title={mostrarAbreviatura ? "Mostrar nombres completos" : "Mostrar abreviaturas"}
                  >
                    <motion.div
                      animate={{ rotate: mostrarAbreviatura ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center justify-center"
                    >
                      <Icon icon="lucide:arrow-left-right" width={16} />
                    </motion.div>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mode === 'editar' && (
        <div className="pt-2">
          {motivoDescripcion ? (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-secondary/5 rounded-medium border border-secondary/10 dark:bg-white/5 dark:border-white/10"
            >
              <p className="text-secondary dark:text-foreground text-sm font-medium flex items-center gap-2">
                <Icon icon="lucide:info" width={16} className="text-secondary" />
                {motivoDescripcion}
              </p>
            </motion.div>
          ) : (
            <hr className="border-default-100 mb-4" />
          )}
          <div className="flex items-center gap-2 mb-4 text-warning font-bold">
            <Icon icon="lucide:arrow-up-down" width={20} />
            <span>Flujo de Stock</span>
          </div>
        </div>
      )}

      {mode === 'editar' && (
        <p className="text-xs text-default-500 px-0.5 mb-1">
          Stock Actual: <span className="font-semibold text-secondary">{fmtCL(originalStockVal)}</span>
        </p>
      )}

      <div className={`grid grid-cols-1 ${mode === 'editar' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>

        {mode === 'editar' && (() => {
          const opcionesMotivo = origenContext === 'bodega'
            ? [
                { key: 'ENTRADA_BODEGA', label: 'Entrada' },
                { key: 'DEVOLUCION', label: 'Devolución' },
                { key: 'AJUSTE_BODEGA', label: 'Ajuste' },
                { key: 'SALIDA_BODEGA', label: 'Salida' },
                { key: 'MERMA_BODEGA', label: 'Merma' },
              ]
            : [
                { key: 'ENTRADA_INVENTARIO', label: 'Entrada' },
                { key: 'TRASLADO', label: 'Traslado' },
                { key: 'AJUSTE_INVENTARIO', label: 'Ajuste' },
                { key: 'SALIDA_INVENTARIO', label: 'Salida' },
                { key: 'MERMA_INVENTARIO', label: 'Merma' },
              ];

          return (
            <Select
              label="Motivo"
              placeholder="Seleccione..."
              selectedKeys={tipoMovimiento ? [tipoMovimiento] : []}
              onChange={(e: any) => setTipoMovimiento(e.target.value)}
              isRequired
              variant="bordered"
              classNames={{ trigger: "bg-white dark:bg-default-100/50" }}
            >
              {opcionesMotivo.map(opcion => (
                <SelectItem key={opcion.key} textValue={opcion.label}>
                  <Tooltip content={opcion.label} placement="right" closeDelay={0} isDisabled={opcion.key !== 'SALIDA_INVENTARIO' && opcion.key !== 'TRASLADO' && opcion.key !== 'SALIDA_BODEGA' && opcion.key !== 'DEVOLUCION'}>
                    <span className="w-full inline-block">{opcion.label}</span>
                  </Tooltip>
                </SelectItem>
              ))}
            </Select>
          );
        })()}

        {mode === 'editar' ? (
          <Input
            type="number"
            label={isAjusteEdit ? 'Nuevo Stock' : 'Cantidad'}
            placeholder={isAjusteEdit ? `Actual: ${fmtCL(originalStockVal)}` : 'Ingrese la cantidad...'}
            value={deltaInput}
            onValueChange={(val) => {
              if (val === '') { setDeltaInput(''); return; }
              const regex = esUnidadFraccionaria ? /^\d{0,7}(\.\d{0,3})?$/ : /^\d{0,7}$/;
              if (regex.test(val)) setDeltaInput(val);
            }}
            min={isAjusteEdit ? '0' : '0.001'}
            step={esUnidadFraccionaria ? '0.001' : '1'}
            isRequired={!!tipoMovimiento}
            isDisabled={!tipoMovimiento}
            isInvalid={!!deltaError}
            errorMessage={deltaError}
            description={
              deltaInput !== '' && !isNaN(deltaVal) && !deltaError
                ? `Stock Final: ${fmtCL(stockFinal)}`
                : undefined
            }
            variant="bordered"
            classNames={{ inputWrapper: 'bg-white dark:bg-default-100/50' }}
          />
        ) : (
          <Input
            type="number"
            label="Stock"
            placeholder="Stock actual"
            value={stock}
            onValueChange={(val) => {
              if (val === '') { setStock(''); return; }
              const regex = esUnidadFraccionaria ? /^\d{0,7}(\.\d{0,3})?$/ : /^\d{0,7}$/;
              if (regex.test(val)) setStock(val);
            }}
            min="0"
            max="9999999.999"
            step={esUnidadFraccionaria ? "0.001" : "1"}
            isRequired
            variant="bordered"
            classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
          />
        )}

        <Input
          type="number"
          label={<span className="whitespace-nowrap truncate max-w-full">{origenContext === 'bodega' ? 'Stock Máx. (Opcional)' : 'Stock Mín. (Opcional)'}</span>}
          placeholder={origenContext === 'bodega' ? 'Stock máximo' : 'Stock mínimo'}
          value={stockMinimo}
          onValueChange={(val) => {
            if (val === '') {
              setStockMinimo('');
              return;
            }

            // Regex dinámico según si es fraccionario o no
            const regex = esUnidadFraccionaria
              ? /^\d{0,7}(\.\d{0,3})?$/
              : /^\d{0,7}$/;

            if (regex.test(val)) {
              setStockMinimo(val);
            }
          }}
          min="0"
          max="9999999.999"
          step={esUnidadFraccionaria ? "0.001" : "1"}
          variant="bordered"
          classNames={{ inputWrapper: "bg-white dark:bg-default-100/50" }}
        />

      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-default-100 mt-4">
        <Button variant="ghost" onPress={onClose} isDisabled={isLoading} className="font-medium">
          Cancelar
        </Button>
        <Button
          color="primary"
          variant="solid"
          onPress={handleSubmit}
          isLoading={isLoading}
          isDisabled={isFormInvalid || isLoading}
          className="font-bold text-secondary shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          startContent={<Icon icon="lucide:save" />}
        >
          {mode === 'crear' ? (origenContext === 'bodega' ? 'Crear a Bodega' : 'Crear Inventario') : 'Guardar Cambios'}
        </Button>
      </div>

      {/* Caso 1: confirmar registro de la entrada como stock disponible (solo bodega) */}
      <ConfirmarDisponibleBodegaModal
        isOpen={isDisponibleBodegaOpen}
        isLoading={isLoading}
        items={[{
          idProducto: producto ? parseInt(producto.id) : 0,
          nombreProducto: nombre.trim() || producto?.nombre || '',
          unidad: producto?.unidadMedida,
          cantidad: parseFloat(deltaInput) || 0,
        }]}
        onCancelar={() => { setIsDisponibleBodegaOpen(false); ejecutarGuardado(false); }}
        onConfirmar={() => { setIsDisponibleBodegaOpen(false); ejecutarGuardado(true); }}
      />

      {/* Caso 1 salida: confirmar descuento del disponible al salir (solo bodega) */}
      <ConfirmarSalidaDisponibleModal
        isOpen={isSalidaDisponibleBodegaOpen}
        isLoading={isLoading}
        tipoMovimientoLabel="Salida"
        items={salidaDisponibleBodega ? [salidaDisponibleBodega] : []}
        onCancelar={() => { setIsSalidaDisponibleBodegaOpen(false); ejecutarGuardado(false); }}
        onConfirmar={() => {
          setIsSalidaDisponibleBodegaOpen(false);
          if (salidaDisponibleBodega) {
            ejecutarGuardado(false, {
              cantidad: salidaDisponibleBodega.aDescontar,
              disponibleEnVista: salidaDisponibleBodega.disponible,
            });
          } else {
            ejecutarGuardado(false);
          }
        }}
      />
    </div>
  );
};

export default FormularioProducto;
