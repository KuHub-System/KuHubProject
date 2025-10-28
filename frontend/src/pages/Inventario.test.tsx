import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { test, describe, expect, vi, beforeEach, afterEach } from "vitest";
import { Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import InventarioPage from "./Inventario";
import * as productoService from "../services/producto-service";
import { IProducto } from "../types/producto.types";

// Mock de los servicios
vi.mock("../services/producto-service");

// Mock de framer-motion para evitar problemas con animaciones en tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock de @iconify/react
vi.mock("@iconify/react", () => ({
  Icon: ({ icon, ...props }: any) => <span data-testid={`icon-${icon}`} {...props} />,
}));
//icon="lucide:edit"

// Datos de prueba con TODOS los atributos de IProducto
const mockProductos: IProducto[] = [
  {
    id: "1",
    nombre: "Harina",
    descripcion: "Harina de trigo para todo uso",
    categoria: "Secos",
    unidadMedida: "kg",
    stock: 49.99,
    stockMinimo: 10,
    fechaCreacion: "2024-01-15T10:00:00Z",
    fechaActualizacion: "2024-01-20T15:30:00Z",
  },
  {
    id: "2",
    nombre: "Aceite de Oliva",
    descripcion: "Aceite de oliva extra virgen",
    categoria: "Líquidos",
    unidadMedida: "l",
    stock: 25,
    stockMinimo: 10,
    fechaCreacion: "2024-01-10T09:00:00Z",
    fechaActualizacion: "2024-01-18T11:00:00Z",
  },
  {
    id: "3",
    nombre: "Azúcar",
    descripcion: "Azúcar refinada",
    categoria: "Secos",
    unidadMedida: "kg",
    stock: 5,
    stockMinimo: 10,
    fechaCreacion: "2024-01-12T14:00:00Z",
    fechaActualizacion: "2024-01-19T16:00:00Z",
  },
  {
    id: "4",
    nombre: "Leche",
    descripcion: "Leche entera",
    categoria: "Lácteos",
    unidadMedida: "l",
    stock: 0,
    stockMinimo: 5,
    fechaCreacion: "2024-01-08T08:00:00Z",
    fechaActualizacion: "2024-01-22T10:00:00Z",
  },
];

// Helper para renderizar con Router
const renderWithRouter = (component: React.ReactElement) => {
  const history = createMemoryHistory();
  return {
    ...render(<Router history={history}>{component}</Router>),
    history,
  };
};

describe("InventarioPage", () => {
  beforeEach(() => {
    // Configurar el mock del servicio antes de cada prueba
    vi.mocked(productoService.obtenerProductosService).mockResolvedValue(mockProductos);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });


  test("Debería coincidir el snapshot", async () => {
    const { container } = renderWithRouter(<InventarioPage />);
    
    // Esperar a que se carguen los productos
    await waitFor(() => {
      expect(screen.queryByText("Harina")).toBeInTheDocument();
    });

    expect(container).toMatchSnapshot();
  });
  

  test("Debería cargar y mostrar todos los productos correctamente", async () => {
    renderWithRouter(<InventarioPage />);

    // Verificar que se llamó al servicio
    expect(productoService.obtenerProductosService).toHaveBeenCalledTimes(1);

    // Esperar a que se rendericen los productos
    await waitFor(() => {
      expect(screen.getByText("Harina")).toBeInTheDocument();
      expect(screen.getByText("Aceite de Oliva")).toBeInTheDocument();
      expect(screen.getByText("Azúcar")).toBeInTheDocument();
      expect(screen.getByText("Leche")).toBeInTheDocument();
    });
  });

  test("Debería filtrar productos por término de búsqueda", async () => {
    renderWithRouter(<InventarioPage />);

    // Esperar a que se carguen los productos
    await waitFor(() => {
      expect(screen.getByText("Harina")).toBeInTheDocument();
    });

    // Buscar el input de búsqueda y escribir
    const searchInput = screen.getByPlaceholderText("Buscar productos...");
    fireEvent.change(searchInput, { target: { value: "Harina" } });

    // Verificar que solo aparece Harina
    await waitFor(() => {
      expect(screen.getByText("Harina")).toBeInTheDocument();
      expect(screen.queryByText("Aceite de Oliva")).not.toBeInTheDocument();
      expect(screen.queryByText("Azúcar")).not.toBeInTheDocument();
    });
  });

  test("Debería renderizar correctamente los chips de estado de stock", async () => {
    renderWithRouter(<InventarioPage />);

    await waitFor(() => {
      // Stock disponible (Harina: 49.99 >= 10, Aceite: 25 >= 10)
      const disponibleChips = screen.getAllByText("Disponible");
      expect(disponibleChips.length).toBeGreaterThan(0);

      // Stock bajo (Azúcar: 5 < 10)
      const stockBajoChip = screen.getByText("Stock bajo");
      expect(stockBajoChip).toBeInTheDocument();

      // Sin stock (Leche: 0)
      const sinStockChip = screen.getByText("Sin stock");
      expect(sinStockChip).toBeInTheDocument();
    });
  });

  test("Debería abrir el modal de edición cuando se hace clic en el botón editar", async () => {
    renderWithRouter(<InventarioPage />);

    // Esperar a que se carguen los productos
    await waitFor(() => {
      expect(screen.getByText("Harina")).toBeInTheDocument();
    });

    // Buscar todos los botones de editar (por el ícono)
    const editButtons = screen.getAllByTestId("icon-lucide:edit");
    
    // Hacer clic en el primer botón de editar
    const firstEditButton = editButtons[0].closest("button");
    if (firstEditButton) {
      fireEvent.click(firstEditButton);
    }

    // Verificar que el modal se abrió
    await waitFor(() => {
      expect(screen.getByText("Editar Producto")).toBeInTheDocument();
    });
  });

  test("Debería abrir el modal de crear producto al hacer clic en 'Nuevo Producto'", async () => {
    renderWithRouter(<InventarioPage />);

    // Esperar a que se carguen los productos
    await waitFor(() => {
      expect(screen.getByText("Harina")).toBeInTheDocument();
    });

    // Buscar y hacer clic en el botón "Nuevo Producto"
    const nuevoProductoButton = screen.getByRole("button", { name: /Nuevo Producto/i });
    fireEvent.click(nuevoProductoButton);

    // Verificar que el modal se abrió en modo crear
    // Esperamos que aparezcan 2 elementos con "Nuevo Producto": el botón y el título del modal
    await waitFor(() => {
      const nuevoProductoElements = screen.getAllByText("Nuevo Producto");
      expect(nuevoProductoElements.length).toBeGreaterThanOrEqual(2);
    });
  });

  test("Debería filtrar productos con stock bajo", async () => {
    renderWithRouter(<InventarioPage />);

    // Esperar a que se carguen los productos
    await waitFor(() => {
      expect(screen.getByText("Harina")).toBeInTheDocument();
    });

    // Los productos con stock bajo son: Azúcar (5 < 10) y Leche (0 < 5)
    // Verificar que se muestran los chips correctos
    const stockBajoChip = screen.getByText("Stock bajo");
    const sinStockChip = screen.getByText("Sin stock");
    
    expect(stockBajoChip).toBeInTheDocument();
    expect(sinStockChip).toBeInTheDocument();
  });

  test("Debería manejar errores al cargar productos", async () => {
    // Configurar el mock para que falle
    vi.mocked(productoService.obtenerProductosService).mockRejectedValue(
      new Error("Error de red")
    );

    // Espiar console.error para verificar que se registra el error
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithRouter(<InventarioPage />);

    // Esperar a que se maneje el error
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error al cargar productos:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  test("Debería paginar los productos correctamente", async () => {
    // Crear más de 10 productos para probar la paginación
    const muchoProductos: IProducto[] = Array.from({ length: 25 }, (_, i) => ({
      id: `${i + 1}`,
      nombre: `Producto ${i + 1}`,
      descripcion: `Descripción ${i + 1}`,
      categoria: "Secos",
      unidadMedida: "kg",
      stock: 10,
      stockMinimo: 5,
      fechaCreacion: "2024-01-15T10:00:00Z",
      fechaActualizacion: "2024-01-20T15:30:00Z",
    }));

    vi.mocked(productoService.obtenerProductosService).mockResolvedValue(muchoProductos);

    renderWithRouter(<InventarioPage />);

    // Esperar a que se carguen los productos
    await waitFor(() => {
      expect(screen.getByText("Producto 1")).toBeInTheDocument();
    });

    // Verificar que solo se muestran 10 productos en la primera página
    expect(screen.getByText("Producto 10")).toBeInTheDocument();
    expect(screen.queryByText("Producto 11")).not.toBeInTheDocument();
  });

  test("Debería mostrar el título 'Inventario' correctamente", async () => {
    renderWithRouter(<InventarioPage />);

    // Verificar que el título principal se renderiza
    const titulo = screen.getByText("Inventario");
    expect(titulo).toBeInTheDocument();
  });

  test("Debería mostrar la descripción del inventario", async () => {
    renderWithRouter(<InventarioPage />);

    // Verificar que la descripción se renderiza
    const descripcion = screen.getByText(/Gestione los productos del inventario/i);
    expect(descripcion).toBeInTheDocument();
  });

 test("Debería crear un nuevo producto correctamente", async () => {
    // Mock del servicio de crear producto - devuelve un IProducto completo
    vi.mocked(productoService.crearProductoService).mockResolvedValue({
      id: "999",
      nombre: "Producto Test",
      descripcion: "Descripción del producto test",
      categoria: "Abarrotes",
      unidadMedida: "kg",
      stock: 20,
      stockMinimo: 5,
      fechaCreacion: "2024-01-25T10:00:00Z",
      fechaActualizacion: "2024-01-25T10:00:00Z",
    });

    // Mock de window.alert para evitar que bloquee el test
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithRouter(<InventarioPage />);
    
    // Esperar a que se carguen los productos
    await waitFor(() => {
      expect(screen.getByText("Harina")).toBeInTheDocument();
    });

    // Buscar y hacer clic en Nuevo Producto
    const nuevoProductoButton = screen.getByRole("button", { name: /Nuevo Producto/i });
    fireEvent.click(nuevoProductoButton);

    // Esperar a que aparezca el modal - debería haber 2 elementos con "Nuevo Producto" (botón + título)
    await waitFor(() => {
      const elementos = screen.getAllByText("Nuevo Producto");
      expect(elementos.length).toBeGreaterThanOrEqual(2);
    });

    // Rellenar Formulario
    const nombreInput = screen.getByLabelText(/^Nombre$/i);
    const descripcionInput = screen.getByLabelText(/Descripción/i);
    
    // Para los select, necesitamos buscar por el label y luego el select
    const categoriaLabel = screen.getByText(/Categoría/i, { selector: 'label' });
    const categoriaSelect = categoriaLabel.parentElement?.querySelector('select');
    
    const unidadLabel = screen.getByText(/Unidad de Medida/i, { selector: 'label' });
    const unidadMedidaSelect = unidadLabel.parentElement?.querySelector('select');
    
    const stockInput = screen.getByLabelText(/^Stock$/i);
    const stockMinimoInput = screen.getByLabelText(/Stock Mínimo/i);

    // Llenar los campos
    fireEvent.change(nombreInput, { target: { value: "Producto Test" } });
    fireEvent.change(descripcionInput, { target: { value: "Descripción del producto test" } });
    
    if (categoriaSelect) {
      fireEvent.change(categoriaSelect, { target: { value: "Abarrotes" } });
    }
    
    if (unidadMedidaSelect) {
      fireEvent.change(unidadMedidaSelect, { target: { value: "kg" } });
    }
    
    fireEvent.change(stockInput, { target: { value: "20" } });
    fireEvent.change(stockMinimoInput, { target: { value: "5" } });

    // Hacer clic en el botón Crear Producto
    const guardarButton = screen.getByRole("button", { name: /Crear Producto/i });
    fireEvent.click(guardarButton);

    // Verificar que se llamó al servicio con los datos correctos
    await waitFor(() => {
      expect(productoService.crearProductoService).toHaveBeenCalledWith({
        nombre: "Producto Test",
        descripcion: "Descripción del producto test",
        categoria: "Abarrotes",
        unidadMedida: "kg",
        stock: 20,
        stockMinimo: 5,
      });
    });

    // Verificar que se mostró el alert de éxito
    expect(alertMock).toHaveBeenCalledWith('Producto creado exitosamente');

    // Limpiar mocks
    alertMock.mockRestore();
  });

});
