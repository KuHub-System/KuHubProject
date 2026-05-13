from docx import Document
from docx.oxml import parse_xml
import shutil
import re

# Hacer backup del original
shutil.copy("C:\\Users\\Matheus\\Downloads\\A_editar.docx", "C:\\Users\\Matheus\\Downloads\\A_editar_backup.docx")

# Leer el documento original
doc = Document("C:\\Users\\Matheus\\Downloads\\A_editar.docx")

# Leer el XML generado con BOM (UTF-8-sig)
with open("new_sections_utf8.xml", "r", encoding="utf-8-sig") as f:
    xml_content = f.read()

# Escapar caracteres especiales problemáticos en el contenido de texto (NO en atributos)
# Reemplazar & con &amp; primero
xml_content = xml_content.replace("&", "&amp;")
# Luego revertir los &amp;amp; que se crearon de & que ya eran parte de &something;
xml_content = re.sub(r"&amp;(#\d+|#x[\da-fA-F]+|[a-zA-Z]+);", r"&\1;", xml_content)
# Ahora escapar < y > solo en contenido de texto (entre > y <), no en tags
xml_content = re.sub(r">([^<]*)<([^/])", lambda m: f">{m.group(1).replace('<', '&lt;')}<{m.group(2)}", xml_content)

# Crear un documento fragmentado con namespaces
xml_wrapped = f'''<w:body xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
             xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
{xml_content}
</w:body>'''

try:
    # Parsear el XML
    parsed_body = parse_xml(xml_wrapped)

    # Extraer todos los elementos del body parseado y agregarlos al documento
    for element in parsed_body:
        doc._element.body.append(element)

    # Guardar
    doc.save("C:\\Users\\Matheus\\Downloads\\A_editar.docx")
    print("✓ Documento actualizado: C:\\Users\\Matheus\\Downloads\\A_editar.docx")
    print("✓ Backup guardado: C:\\Users\\Matheus\\Downloads\\A_editar_backup.docx")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
