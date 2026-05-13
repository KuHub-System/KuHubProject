# Snippets de Código Copy-Paste

Código listo para copiar y pegar en `generar_evaluacion_docx.py`.

---

## SECCIÓN 1: Agregar al inicio del archivo (después de imports)

```python
import re
from pathlib import Path

# ═════════════════════════════════════════════════════════════════
# FUNCIONES PARA LEER DIAGRAMAS DE ARCHIVOS MD
# ═════════════════════════════════════════════════════════════════

def read_section_from_md(md_file_path, start_marker, end_marker=None):
    """
    Lee una sección de un archivo MD entre dos marcadores.
    """
    with open(md_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    start_idx = content.find(start_marker)
    if start_idx == -1:
        return f"[SECCIÓN NO ENCONTRADA: {start_marker}]"

    start_idx = content.find('\n', start_idx) + 1

    if end_marker:
        end_idx = content.find(end_marker, start_idx)
        if end_idx == -1:
            end_idx = len(content)
    else:
        end_idx = content.find('\n## ', start_idx)
        if end_idx == -1:
            end_idx = len(content)

    return content[start_idx:end_idx].strip()


def extract_diagrama_er_completo(md_file_path):
    """Extrae el diagrama ER completo en formato Mermaid."""
    section = read_section_from_md(
        md_file_path,
        "## 2. DIAGRAMA ER COMPLETO (MERMAID)"
    )
    mermaid_match = re.search(r'```mermaid\n([\s\S]*?)```', section)
    if mermaid_match:
        return mermaid_match.group(1).strip()
    return "Diagrama no encontrado"


def extract_diagramas_ascii_detallados(md_file_path):
    """Extrae todos los diagramas ASCII detallados por módulo."""
    section = read_section_from_md(
        md_file_path,
        "## 4. DIAGRAMAS ASCII DETALLADOS"
    )
    diagramas = {}
    pattern = r'### 4\.\d+ (.*?)\n\n```\n([\s\S]*?)\n```'
    matches = re.finditer(pattern, section)
    for match in matches:
        titulo = match.group(1)
        diagrama = match.group(2)
        diagramas[titulo] = diagrama
    return diagramas


def extract_5_vistas_arquitectura(arquitectura_md_path):
    """Extrae las 5 vistas de arquitectura 4+1 del archivo."""
    with open(arquitectura_md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    vistas = {}
    vista_configs = [
        ('## 1. Vista Lógica', 'Vista Lógica'),
        ('## 2. Vista de Procesos', 'Vista de Procesos'),
        ('## 3. Vista Física', 'Vista Física'),
        ('## 4. Vista de Desarrollo', 'Vista de Desarrollo'),
        ('## 5. Vista de Escenarios', 'Vista de Escenarios'),
    ]
    for marker, vista_nombre in vista_configs:
        section = read_section_from_md(arquitectura_md_path, marker)
        mermaid_blocks = re.findall(r'```mermaid\n([\s\S]*?)```', section)
        if mermaid_blocks:
            vistas[vista_nombre] = mermaid_blocks
        else:
            code_blocks = re.findall(r'```\n([\s\S]*?)```', section)
            if code_blocks:
                vistas[vista_nombre] = code_blocks
    return vistas


def add_diagrama_completo_a_doc(doc, md_file_path, titulo="Diagrama ER Completo"):
    """Agrega el diagrama ER completo (Mermaid) al documento Word."""
    doc.add_heading(titulo, level=2)
    diagrama = extract_diagrama_er_completo(md_file_path)
    if diagrama and diagrama != "Diagrama no encontrado":
        para = doc.add_paragraph()
        para.paragraph_format.left_indent = Cm(0.5)
        para.paragraph_format.space_before = Pt(6)
        para.paragraph_format.space_after = Pt(6)
        run = para.add_run("```mermaid\n" + diagrama + "\n```")
        run.font.name = 'Consolas'
        run.font.size = Pt(8)
        run.font.color.rgb = (50, 50, 50)
    else:
        doc.add_paragraph("[Diagrama no encontrado en archivo MD]")


def add_diagramas_modulo_a_doc(doc, md_file_path):
    """Agrega todos los diagramas ASCII detallados por módulo."""
    doc.add_heading('4. Diagramas ASCII Detallados por Módulo', level=2)
    diagramas = extract_diagramas_ascii_detallados(md_file_path)
    if not diagramas:
        doc.add_paragraph("[No se encontraron diagramas ASCII detallados]")
        return
    for titulo, diagrama_content in diagramas.items():
        doc.add_heading(titulo, level=3)
        para = doc.add_paragraph()
        para.paragraph_format.left_indent = Cm(0.3)
        para.paragraph_format.space_before = Pt(4)
        para.paragraph_format.space_after = Pt(4)
        run = para.add_run(diagrama_content)
        run.font.name = 'Courier New'
        run.font.size = Pt(7)
        run.font.color.rgb = (40, 40, 40)
        doc.add_paragraph()


def add_arquitectura_4_plus_1_a_doc(doc, arquitectura_md_path):
    """Agrega las 5 vistas de arquitectura al documento."""
    doc.add_page_break()
    doc.add_heading('PARTE II — ARQUITECTURA 4+1 VIEWS', level=1)
    doc.add_paragraph('Vistas de Arquitectura del Sistema KuHub v1.0.8')
    doc.add_paragraph()
    vistas = extract_5_vistas_arquitectura(arquitectura_md_path)
    vista_order = [
        'Vista Lógica',
        'Vista de Procesos',
        'Vista Física',
        'Vista de Desarrollo',
        'Vista de Escenarios'
    ]
    for vista_nombre in vista_order:
        if vista_nombre not in vistas:
            continue
        idx = vista_order.index(vista_nombre)
        doc.add_heading(f'{idx + 1}. {vista_nombre}', level=2)
        diagramas = vistas[vista_nombre]
        if isinstance(diagramas, list):
            for diagrama in diagramas:
                para = doc.add_paragraph()
                para.paragraph_format.left_indent = Cm(0.5)
                para.paragraph_format.space_before = Pt(6)
                para.paragraph_format.space_after = Pt(6)
                if 'graph' in diagrama or 'sequenceDiagram' in diagrama or 'stateDiagram' in diagrama:
                    content = "```mermaid\n" + diagrama.strip() + "\n```"
                    run = para.add_run(content)
                    run.font.name = 'Consolas'
                    run.font.size = Pt(7)
                else:
                    run = para.add_run(diagrama)
                    run.font.name = 'Courier New'
                    run.font.size = Pt(7)
                run.font.color.rgb = (30, 30, 30)
        doc.add_paragraph()
```

---

## SECCIÓN 2: Cambio en create_document() — Diagrama ER

**BUSCAR esta línea en create_document():**

```python
    # ─── 2. DIAGRAMA ER COMPLETO ───
    doc.add_heading('2. Diagrama ER Completo', level=2)
    doc.add_paragraph(
        'A continuación se presenta el diagrama ER completo del sistema KuHub. '
        'Las relaciones se representan con la notación estándar (1:N, M:M, 1:1).'
    )
    doc.add_paragraph()

    er_diagram = """
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           DIAGRAMA ER — KuHub v1.0.8                                │
```

**REEMPLAZAR POR:**

```python
    # ─── 2. DIAGRAMA ER COMPLETO ───
    add_diagrama_completo_a_doc(doc, 'DIAGRAMA_ER_KUHUB.md')
    doc.add_paragraph()
```

---

## SECCIÓN 3: Agregar después de la lista de módulos en create_document()

**BUSCAR esta línea:**

```python
    ]

    for modulo_nombre, tablas in modulos_tablas:
```

**AGREGAR ANTES de la línea anterior:**

```python
    doc.add_page_break()
    add_diagramas_modulo_a_doc(doc, 'DIAGRAMA_ER_KUHUB.md')
    doc.add_paragraph()

    # Lista de tablas por módulo
```

---

## SECCIÓN 4: Reemplazar la Parte II completa

**BUSCAR:**

```python
    # ══════════════════════════════════════════════════════════════════════
    # PARTE II — ARQUITECTURA 4+1 VIEWS
    # ══════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    doc.add_heading('PARTE II — ARQUITECTURA 4+1 VIEWS', level=1)
    doc.add_paragraph('Arquitectura de Sistema para KuHub v1.0.8')
    doc.add_paragraph()

    # Vista Lógica
    doc.add_heading('1. Vista Lógica (Logical View)', level=2)
    doc.add_paragraph('Componentes principales y responsabilidades del sistema.')

    vista_logica = """
```

**Hasta donde termina toda la Parte II (buscar el último `doc.add_paragraph()` antes del "RESUMEN FINAL").**

**REEMPLAZAR TODA ESA SECCIÓN POR:**

```python
    # ══════════════════════════════════════════════════════════════════════
    # PARTE II — ARQUITECTURA 4+1 VIEWS (Lee directamente del archivo)
    # ══════════════════════════════════════════════════════════════════════
    add_arquitectura_4_plus_1_a_doc(doc, 'ARQUITECTURA_4+1_VIEWS.md')
    doc.add_paragraph()
```

---

## SECCIÓN 5: Agregar nota informativa (OPCIONAL)

**Al final de create_document(), ANTES de `return doc`:**

```python
    # ─────────────────────────────────────────────────────────────────────
    # NOTA SOBRE ORIGEN DE DIAGRAMAS
    # ─────────────────────────────────────────────────────────────────────
    doc.add_page_break()
    doc.add_heading('NOTA SOBRE DIAGRAMAS', level=1)

    nota_texto = (
        'Los diagramas incluidos en este documento se generan directamente '
        'desde los archivos de especificación en el repositorio:\n\n'
        '📄 DIAGRAMA_ER_KUHUB.md (64 KB)\n'
        '   • Diagrama ER completo en formato Mermaid (erDiagram)\n'
        '   • 8 diagramas ASCII detallados por módulo\n'
        '   • Especificación de relaciones (1:N, M:M, 1:1)\n'
        '   • Restricciones UNIQUE, CHECK, FK\n\n'
        '🏛️ ARQUITECTURA_4+1_VIEWS.md (90 KB)\n'
        '   • 5 vistas de arquitectura (Lógica, Procesos, Física, Desarrollo, Escenarios)\n'
        '   • Diagramas Mermaid: graph, sequenceDiagram, stateDiagram\n'
        '   • Matriz de roles × módulos\n'
        '   • Flujos de procesos críticos\n\n'
        'VENTAJAS:\n'
        '✅ Single source of truth: cambios en MD se reflejan al regenerar Word\n'
        '✅ Versionado en Git: historial de cambios de arquitectura\n'
        '✅ Editables en VS Code, draw.io o cualquier editor MD\n'
        '✅ Soporta render en Mermaid live (mermaid.live) y VS Code\n'
    )

    doc.add_paragraph(nota_texto)

    return doc
```

---

## Checklist de Integración

- [ ] Copiar la SECCIÓN 1 (todas las 6 funciones nuevas) al inicio de `generar_evaluacion_docx.py`
- [ ] Aplicar el cambio de la SECCIÓN 2 (reemplazar diagrama ER ASCII)
- [ ] Aplicar el cambio de la SECCIÓN 3 (agregar diagramas detallados)
- [ ] Aplicar el cambio de la SECCIÓN 4 (reemplazar Parte II arquitectura)
- [ ] (Opcional) Aplicar cambio de SECCIÓN 5 (nota informativa)
- [ ] Ejecutar: `python generar_evaluacion_docx.py`
- [ ] Verificar que el DOCX se genera sin errores
- [ ] Abrir el DOCX y revisar que aparezcan los diagramas

---

## Verificación Rápida

Después de ejecutar el script, el DOCX debe contener:

✅ **Sección 2:** Diagrama ER en Mermaid (bloque ```mermaid...```)

✅ **Sección 4:** 8 diagramas ASCII:
  1. Núcleo de Seguridad
  2. Módulo Académico
  3. Módulo de Inventario
  4. Módulo de Proveedores
  5. Módulo de Configuración
  6. Módulo de Pedido Semanal a Bodega
  7. Módulo de Solicitudes
  8. Módulo de Pedidos

✅ **Parte II:** 5 vistas de arquitectura (Lógica, Procesos, Física, Desarrollo, Escenarios)

✅ **Final:** Nota informativa sobre origen de diagramas

---

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `FileNotFoundError: DIAGRAMA_ER_KUHUB.md` | Verificar que el archivo esté en el mismo directorio que el script |
| `[SECCIÓN NO ENCONTRADA]` | Revisar que los marcadores de sección en el MD coincidan exactamente |
| Sin diagramas en el DOCX | Verificar que las funciones de lectura retornan contenido (agregar print debug) |
| Caracteres raros en ASCII | Asegurarse de que el archivo se guarde en UTF-8 |

---

**Generado:** 2026-05-12  
**Para:** KuHub v1.0.8
