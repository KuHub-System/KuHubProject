/**
 * SERVICIO DE GENERACIÓN DE PDFs
 * Genera PDFs para órdenes de compra (general y por proveedor)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface IProductoPedido {
  productoNombre: string;
  cantidad: number;
  unidadMedida: string;
  proveedorNombre: string;
  precioUnitario: number;
  precioTotal: number;
}

export interface IPedidoProveedor {
  proveedorNombre: string;
  proveedorContacto: string;
  proveedorTelefono: string;
  proveedorEmail: string;
  proveedorDireccion: string;
  productos: {
    productoNombre: string;
    cantidad: number;
    unidadMedida: string;
    precioUnitario: number;
    precioTotal: number;
  }[];
  totalPedido: number;
}

/**
 * Generar PDF general con todos los productos y proveedores
 */
export const generarPDFOrdenGeneral = (
  productos: IProductoPedido[],
  fechaPedido: string = new Date().toISOString()
): jsPDF => {
  const doc = new jsPDF();
  const fechaFormateada = new Date(fechaPedido).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Configuración de fuentes y colores
  const colorPrimario: [number, number, number] = [0, 74, 135];
  const colorSecundario: [number, number, number] = [0, 112, 240];

  // ENCABEZADO
  doc.setFillColor(...colorPrimario);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEN DE COMPRA GENERAL', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${fechaFormateada}`, 105, 30, { align: 'center' });

  // INFORMACIÓN DEL PEDIDO
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  let yPos = 50;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Institución:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text('Centro de Formación Técnica Gastronomía', 60, yPos);
  
  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Departamento:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestión de Inventarios', 60, yPos);

  yPos += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('N° de Orden:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`ORD-${Date.now()}`, 60, yPos);

  yPos += 15;

  // TABLA DE PRODUCTOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...colorPrimario);
  doc.text('DETALLE DE PRODUCTOS', 20, yPos);
  
  yPos += 5;

  // Preparar datos para la tabla
  const tableData = productos.map(p => [
    p.productoNombre,
    `${p.cantidad} ${p.unidadMedida}`,
    p.proveedorNombre,
    `$${p.precioUnitario.toLocaleString('es-CL')}`,
    `$${p.precioTotal.toLocaleString('es-CL')}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Producto', 'Cantidad', 'Proveedor', 'Precio Unit.', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: colorPrimario,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 50 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // RESUMEN FINANCIERO
  const totalGeneral = productos.reduce((sum, p) => sum + p.precioTotal, 0);
  const iva = totalGeneral * 0.19;
  const totalConIVA = totalGeneral + iva;

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Cuadro de totales
  doc.setFillColor(245, 245, 245);
  doc.rect(130, yPos, 60, 30, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  doc.text('Subtotal:', 135, yPos + 8);
  doc.text(`$${totalGeneral.toLocaleString('es-CL')}`, 185, yPos + 8, { align: 'right' });
  
  doc.text('IVA (19%):', 135, yPos + 16);
  doc.text(`$${iva.toLocaleString('es-CL')}`, 185, yPos + 16, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setTextColor(...colorPrimario);
  doc.text('TOTAL:', 135, yPos + 25);
  doc.text(`$${totalConIVA.toLocaleString('es-CL')}`, 185, yPos + 25, { align: 'right' });

  // RESUMEN POR PROVEEDOR
  yPos += 40;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...colorPrimario);
  doc.text('RESUMEN POR PROVEEDOR', 20, yPos);
  
  yPos += 5;

  // Agrupar por proveedor
  const proveedoresMap = new Map<string, { productos: IProductoPedido[], total: number }>();
  
  productos.forEach(p => {
    if (!proveedoresMap.has(p.proveedorNombre)) {
      proveedoresMap.set(p.proveedorNombre, { productos: [], total: 0 });
    }
    const proveedor = proveedoresMap.get(p.proveedorNombre)!;
    proveedor.productos.push(p);
    proveedor.total += p.precioTotal;
  });

  const resumenData = Array.from(proveedoresMap.entries()).map(([nombre, data]) => [
    nombre,
    data.productos.length,
    `$${data.total.toLocaleString('es-CL')}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Proveedor', 'N° Productos', 'Total']],
    body: resumenData,
    theme: 'grid',
    headStyles: {
      fillColor: colorSecundario,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // PIE DE PÁGINA
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
    doc.text(
      `Generado el ${new Date().toLocaleString('es-CL')}`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
};

/**
 * Generar PDF individual por proveedor
 */
export const generarPDFOrdenProveedor = (
  pedido: IPedidoProveedor,
  fechaPedido: string = new Date().toISOString()
): jsPDF => {
  const doc = new jsPDF();
  const fechaFormateada = new Date(fechaPedido).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const colorPrimario: [number, number, number] = [0, 74, 135];

  // ENCABEZADO
  doc.setFillColor(...colorPrimario);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEN DE COMPRA', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${fechaFormateada}`, 105, 30, { align: 'center' });

  // INFORMACIÓN DE LA INSTITUCIÓN
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  let yPos = 50;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DATOS DEL COMPRADOR', 20, yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos += 7;
  doc.text('Centro de Formación Técnica Gastronomía', 20, yPos);
  yPos += 5;
  doc.text('Departamento de Gestión de Inventarios', 20, yPos);
  yPos += 5;
  doc.text(`Orden N°: ORD-${Date.now()}-${pedido.proveedorNombre.substring(0, 3).toUpperCase()}`, 20, yPos);

  yPos += 15;

  // INFORMACIÓN DEL PROVEEDOR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PROVEEDOR', 20, yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  yPos += 7;
  doc.text(`Nombre: ${pedido.proveedorNombre}`, 20, yPos);
  yPos += 5;
  doc.text(`Contacto: ${pedido.proveedorContacto}`, 20, yPos);
  yPos += 5;
  doc.text(`Teléfono: ${pedido.proveedorTelefono}`, 20, yPos);
  yPos += 5;
  doc.text(`Email: ${pedido.proveedorEmail}`, 20, yPos);
  yPos += 5;
  doc.text(`Dirección: ${pedido.proveedorDireccion}`, 20, yPos);

  yPos += 15;

  // TABLA DE PRODUCTOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...colorPrimario);
  doc.text('PRODUCTOS SOLICITADOS', 20, yPos);
  
  yPos += 5;

  const tableData = pedido.productos.map((p, index) => [
    (index + 1).toString(),
    p.productoNombre,
    `${p.cantidad} ${p.unidadMedida}`,
    `$${p.precioUnitario.toLocaleString('es-CL')}`,
    `$${p.precioTotal.toLocaleString('es-CL')}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Producto', 'Cantidad', 'Precio Unit.', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: colorPrimario,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  });

  // TOTALES
  const subtotal = pedido.totalPedido;
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  yPos = (doc as any).lastAutoTable.finalY + 10;

  doc.setFillColor(...colorPrimario);
  doc.rect(130, yPos, 60, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  
  doc.text('Subtotal:', 135, yPos + 8);
  doc.text(`$${subtotal.toLocaleString('es-CL')}`, 185, yPos + 8, { align: 'right' });
  
  doc.text('IVA (19%):', 135, yPos + 16);
  doc.text(`$${iva.toLocaleString('es-CL')}`, 185, yPos + 16, { align: 'right' });
  
  doc.setFontSize(12);
  doc.text('TOTAL:', 135, yPos + 27);
  doc.text(`$${total.toLocaleString('es-CL')}`, 185, yPos + 27, { align: 'right' });

  // CONDICIONES
  yPos += 45;
  
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CONDICIONES DE COMPRA', 20, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  yPos += 7;
  doc.text('• Forma de pago: Por definir según condiciones del proveedor', 20, yPos);
  yPos += 5;
  doc.text('• Plazo de entrega: Según coordinación con el proveedor', 20, yPos);
  yPos += 5;
  doc.text('• Lugar de entrega: Centro de Formación Técnica Gastronomía', 20, yPos);
  yPos += 5;
  doc.text('• Los productos deben cumplir con las especificaciones solicitadas', 20, yPos);
  yPos += 5;
  doc.text('• Se requiere factura electrónica para procesar el pago', 20, yPos);

  // FIRMAS
  yPos += 20;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  
  // Firma Comprador
  doc.line(20, yPos + 15, 80, yPos + 15);
  doc.text('Firma y Timbre Comprador', 50, yPos + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Dpto. Gestión de Inventarios', 50, yPos + 25, { align: 'center' });
  
  // Firma Proveedor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.line(130, yPos + 15, 190, yPos + 15);
  doc.text('Firma y Timbre Proveedor', 160, yPos + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(pedido.proveedorNombre, 160, yPos + 25, { align: 'center' });

  // PIE DE PÁGINA
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generado el ${new Date().toLocaleString('es-CL')}`,
    105,
    285,
    { align: 'center' }
  );
  doc.text(
    'Documento generado automáticamente - Sistema de Gestión de Inventarios',
    105,
    290,
    { align: 'center' }
  );

  return doc;
};

/**
 * Descargar PDF
 */
export const descargarPDF = (doc: jsPDF, nombreArchivo: string): void => {
  doc.save(nombreArchivo);
  console.log(`📄 PDF descargado: ${nombreArchivo}`);
};

/**
 * Generar y descargar todos los PDFs (general + por proveedor)
 */
export const generarYDescargarTodosPDFs = (
  productos: IProductoPedido[],
  pedidosPorProveedor: IPedidoProveedor[],
  fechaPedido: string = new Date().toISOString()
): void => {
  // PDF General
  const pdfGeneral = generarPDFOrdenGeneral(productos, fechaPedido);
  descargarPDF(pdfGeneral, `Orden_Compra_General_${Date.now()}.pdf`);

  // Esperar un momento para evitar bloqueo del navegador
  setTimeout(() => {
    // PDFs por proveedor
    pedidosPorProveedor.forEach((pedido, index) => {
      setTimeout(() => {
        const pdfProveedor = generarPDFOrdenProveedor(pedido, fechaPedido);
        const nombreProveedor = pedido.proveedorNombre.replace(/\s+/g, '_');
        descargarPDF(pdfProveedor, `Orden_${nombreProveedor}_${Date.now()}.pdf`);
      }, index * 500); // Delay de 500ms entre cada descarga
    });
  }, 1000);

  console.log(`✅ Generados ${1 + pedidosPorProveedor.length} PDFs`);
};

/**
 * Vista previa del PDF en nueva ventana
 */
export const previsualizarPDF = (doc: jsPDF): void => {
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
};