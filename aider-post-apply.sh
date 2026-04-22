#!/bin/bash

# Banderas iniciales
run_frontend=false
run_backend=false

# Aider pasa los archivos modificados como argumentos ($1, $2, etc.)
# Iteramos sobre ellos para detectar dónde hubo cambios
for file in "$@"; do
  # Usamos comodines (*) para que soporte barras invertidas (\) de Windows
  if [[ "$file" == *"frontend"* ]]; then
    run_frontend=true
  elif [[ "$file" == *"backend"* ]]; then
    run_backend=true
  fi
done

# ==========================================
# 1. VALIDACIÓN DEL FRONTEND (TypeScript)
# ==========================================
if [ "$run_frontend" = true ]; then
  echo "🔍 [Aider] Cambios detectados en el FRONTEND. Ejecutando type-check..."
  cd frontend
  npm run type-check
  FRONTEND_STATUS=$?
  cd ..

  if [ $FRONTEND_STATUS -ne 0 ]; then
    echo "❌ [Aider] Error en el Frontend. Aider intentará arreglarlo."
    exit $FRONTEND_STATUS
  fi
  echo "✅ [Aider] Frontend validado correctamente."
fi

# ==========================================
# 2. VALIDACIÓN DEL BACKEND (Java/Spring Boot)
# ==========================================
if [ "$run_backend" = true ]; then
  echo "☕ [Aider] Cambios detectados en el BACKEND. Compilando..."

  # Asumiendo que tu Maven wrapper está en la raíz según tu captura
  # Puedes cambiar "compile" por "test" si quieres que corra las pruebas
  ./mvnw clean compile
  BACKEND_STATUS=$?

  if [ $BACKEND_STATUS -ne 0 ]; then
    echo "❌ [Aider] Error de compilación en el Backend. Aider intentará arreglarlo."
    exit $BACKEND_STATUS
  fi
  echo "✅ [Aider] Backend compilado correctamente."
fi

# Si no detectó ni frontend ni backend (o si no se pasaron argumentos)
if [ "$run_frontend" = false ] && [ "$run_backend" = false ]; then
  echo "⚠️ [Aider] No se detectaron archivos de Frontend o Backend. Omitiendo validaciones."
fi

exit 0