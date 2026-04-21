# Análisis: Persistencia del selector de período/semana entre páginas

## Contexto actual

En el sistema existen cuatro páginas principales que utilizan el mismo componente de selector de período académico y semana:

1. `solicitud.tsx` - Solicitud de Insumos
2. `gestion-solicitudes.tsx` - Gestión de Solicitudes
3. `gestion-pedidos.tsx` - Gestión de Pedidos
4. `conglomerado-pedidos.tsx` - Conglomerado de Pedidos

Cada página implementa su propia lógica para:
- Cargar períodos académicos desde `obtenerPeriodosAcademicosService()`
- Cargar semanas para un período con `obtenerSemanasPorPeriodoService()`
- Detectar período actual con `detectarPeriodoActual()`
- Encontrar semana actual con `encontrarSemanaActual()`
- Manejar cambios de período con `handlePeriodoChange()`
- Mantener estado local de `semanaId`, `periodos`, `semanas`, etc.

## Problema identificado

Cuando el usuario navega entre estas páginas, la selección actual de período y semana **no se mantiene**. Cada página carga sus propios datos y restablece los selectores a sus valores por defecto, lo que genera una experiencia  
inconsistente.

## Objetivo

Implementar una solución que permita **persistir la selección de período y semana** a través de la navegación, de modo que cuando el usuario cambie de página, los selectores muestren automáticamente la misma selección que tenía
en la página anterior.

## Ubicación del código en cada página

### 1. `solicitud.tsx`
**Rango aproximado:** Líneas 400-550
- Estados: `periodos`, `semanas`, `currentPeriodo`, `defaultSemanaId`, `isLoadingSemanas`
- Efectos: Carga inicial de semanas (líneas ~430-480)
- Función: `cargarSemanasParaPeriodo` (líneas ~380-400)
- Selector UI: Líneas ~600-700 (componente Card con botones de período y Select de semanas)

### 2. `gestion-solicitudes.tsx`
**Rango aproximado:** Líneas 100-200
- Estados: `periodos`, `semanas`, `semanaId`, `defaultSemanaId`, `isLoadingSem`
- Efectos: Carga inicial (líneas ~130-170)
- Función: `handlePeriodoChange` (líneas ~180-200)
- Selector UI: Líneas ~300-400 (primer Card del componente)

### 3. `gestion-pedidos.tsx`
**Rango aproximado:** Líneas 80-180
- Estados: `periodos`, `semanas`, `semanaId`, `defaultSemanaId`, `isLoadingSem`
- Efectos: Carga inicial (líneas ~100-140)
- Función: `handlePeriodoChange` (líneas ~150-170)
- Selector UI: Líneas ~250-350 (primer Card del componente)

### 4. `conglomerado-pedidos.tsx`
**Rango aproximado:** Líneas 80-180
- Estados: `periodos`, `semanas`, `semanaId`, `defaultSemanaId`, `isLoadingSem`
- Efectos: Carga inicial (líneas ~100-140)
- Función: `handlePeriodoChange` (líneas ~150-170)
- Selector UI: Líneas ~250-350 (primer Card del componente)

## Patrones comunes identificados

Todas las páginas siguen la misma estructura:

1. **Estados iniciales:**
   ```typescript                                                                                                                                                                                                                    
   const [periodos, setPeriodos] = React.useState<IPeriodoAcademico[]>([]);                                                                                                                                                         
   const [semanas, setSemanas] = React.useState<ISemana[]>([]);                                                                                                                                                                     
   const [semanaId, setSemanaId] = React.useState<string>('');                                                                                                                                                                      
   const [defaultSemanaId, setDefaultSemanaId] = React.useState<string>('');                                                                                                                                                        
   const [isLoadingSem, setIsLoadingSem] = React.useState(true);                                                                                                                                                                    
                                                                                                                                                                                                                                    

2 useEffect de carga inicial: Llama a obtenerPeriodosAcademicosService() y determina el período actual.                                                                                                                            
3 Función handlePeriodoChange: Recibe anio y semestre, carga las semanas correspondientes y actualiza semanas y semanaId.                                                                                                          
4 UI similar: Card con botones de período (años-semestres) y un Select de HeroUI para semanas.


Estrategias posibles

1. Estado global con Context API

Crear un contexto React (PeriodoSemanaContext) que almacene:

• periodoSeleccionado: { anio: number, semestre: number }                                                                                                                                                                          
• semanaSeleccionadaId: string                                                                                                                                                                                                     
• Funciones para actualizar estos valores

Ventajas:

• Centralizado                                                                                                                                                                                                                     
• Fácil de consumir desde cualquier componente                                                                                                                                                                                     
• Reactivo (cambios se propagan automáticamente)

Desventajas:

• Requiere refactorizar las cuatro páginas                                                                                                                                                                                         
• Necesita manejar inicialización asíncrona (carga de períodos)

2. Estado en URL (query parameters)

Almacenar la selección en la URL como parámetros:

• ?periodo=2025-1&semana=42

Ventajas:

• Persistente incluso al recargar la página                                                                                                                                                                                        
• Fácil de compartir                                                                                                                                                                                                               
• No requiere estado global

Desventajas:

• Requiere modificar la navegación                                                                                                                                                                                                 
• Las páginas deben leer y escribir parámetros                                                                                                                                                                                     
• Puede complicar el routing

3. Almacenamiento en localStorage/sessionStorage

Guardar la selección en sessionStorage (persiste durante la sesión del navegador)

Ventajas:

• Simple de implementar                                                                                                                                                                                                            
• Persiste entre recargas                                                                                                                                                                                                          
• No requiere cambios grandes en la arquitectura

Desventajas:

• No se sincroniza entre pestañas                                                                                                                                                                                                  
• Puede quedar obsoleto si la estructura de datos cambia

4. Combinación: Context + localStorage

• Usar Context para estado en memoria                                                                                                                                                                                              
• Sincronizar con localStorage para persistencia entre recargas


Recomendación

Para este sistema, la combinación de Context API + localStorage parece más adecuada:

1 Crear un hook personalizado usePeriodoSemana() que:                                                                                                                                                                              
• Lee/escribe del localStorage                                                                                                                                                                                                  
• Provee el estado a través de Context                                                                                                                                                                                          
• Maneja la inicialización con los servicios existentes                                                                                                                                                                         
2 Refactorizar las cuatro páginas para que:                                                                                                                                                                                        
• Usen el hook en lugar de su lógica local                                                                                                                                                                                      
• Se suscriban a cambios en el contexto                                                                                                                                                                                         
3 Mantener compatibilidad con la lógica existente:                                                                                                                                                                                 
• Los servicios actuales (obtenerPeriodosAcademicosService, etc.) seguirán usándose                                                                                                                                             
• La UI de selectores se mantendrá igual visualmente


Estructura propuesta


// contexts/periodo-semana-context.tsx                                                                                                                                                                                              
interface PeriodoSemanaState {                                                                                                                                                                                                      
periodo: { anio: number; semestre: number } | null;                                                                                                                                                                               
semanaId: string | null;                                                                                                                                                                                                          
periodos: IPeriodoAcademico[];                                                                                                                                                                                                    
semanas: ISemana[];                                                                                                                                                                                                               
isLoading: boolean;                                                                                                                                                                                                               
}

interface PeriodoSemanaContextType extends PeriodoSemanaState {                                                                                                                                                                     
seleccionarPeriodo: (anio: number, semestre: number) => Promise<void>;                                                                                                                                                            
seleccionarSemana: (semanaId: string) => void;                                                                                                                                                                                    
recargarSemanas: () => Promise<void>;                                                                                                                                                                                             
}

// hooks/use-periodo-semana.ts                                                                                                                                                                                                      
function usePeriodoSemana() {                                                                                                                                                                                                       
// Implementación que coordena Context, localStorage y servicios                                                                                                                                                                  
}



Pasos de implementación (para aplicar después)

1 Crear el contexto y hook                                                                                                                                                                                                         
2 Actualizar cada página para usar el hook:                                                                                                                                                                                        
• Reemplazar estados locales (periodos, semanas, semanaId)                                                                                                                                                                      
• Reemplazar useEffect de carga inicial                                                                                                                                                                                         
• Reemplazar handlePeriodoChange                                                                                                                                                                                                
3 Asegurar que el localStorage se actualice con cada cambio                                                                                                                                                                        
4 Manejar casos de borde:                                                                                                                                                                                                          
• Período no válido (eliminado)                                                                                                                                                                                                 
• Semana no válida (fuera del período)                                                                                                                                                                                          
• Primera visita (sin selección previa)


Consideraciones adicionales

• Performance: Cachear respuestas de servicios para evitar peticiones redundantes                                                                                                                                                  
• Sincronización: Si el usuario tiene múltiples pestañas, considerar storage events                                                                                                                                                
• Backward compatibility: Mantener funcionamiento actual mientras se migra


Archivos a modificar (en futuras iteraciones)

• frontend/src/contexts/periodo-semana-context.tsx (nuevo)                                                                                                                                                                         
• frontend/src/hooks/use-periodo-semana.ts (nuevo)                                                                                                                                                                                 
• frontend/src/pages/solicitud.tsx (líneas ~400-700)                                                                                                                                                                               
• frontend/src/pages/gestion-solicitudes.tsx (líneas ~100-400)                                                                                                                                                                     
• frontend/src/pages/gestion-pedidos.tsx (líneas ~80-350)                                                                                                                                                                          
• frontend/src/pages/conglomerado-pedidos.tsx (líneas ~80-350)


Próximos pasos

Una vez aprobado este análisis, se procederá a:

1 Implementar el contexto y hook                                                                                                                                                                                                   
2 Refactorizar la primera página (solicitud.tsx) como prueba                                                                                                                                                                       
3 Verificar que funciona correctamente                                                                                                                                                                                             
4 Refactorizar las tres páginas restantes                                                                                                                                                                                          
5 Realizar pruebas de integración

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

Documento preparado para guiar la implementación de persistencia de selectores entre páginas.

▌ ▌ ▌ ▌ ▌ ▌ ▌ REPLACE   