#!/bin/bash
# Script que ejecuta Aider después de aplicar cambios
# Valida tanto frontend como backend

echo "🔍 Validando cambios aplicados..."

# Detectar qué archivos fueron modificados
# Si hay cambios en frontend/, ejecutar validación de TypeScript
if git diff --name-only | grep -q "^frontend/"; then
  echo "📱 Detectado cambio en frontend..."
  cd frontend
  echo "  ✓ Ejecutando verificación TypeScript..."
  npx tsc --noEmit
  FRONTEND_STATUS=$?
  cd ..
  if [ $FRONTEND_STATUS -ne 0 ]; then
    echo "  ❌ Error en TypeScript frontend"
  else
    echo "  ✅ Frontend OK"
  fi
else
  FRONTEND_STATUS=0
fi

# Si hay cambios en backend/, ejecutar validación Maven
if git diff --name-only | grep -q "^backend/\|^pom.xml\|^src/"; then
  echo "🔧 Detectado cambio en backend..."
  cd backend
  echo "  ✓ Ejecutando compilación Maven..."
  mvn clean compile -q
  BACKEND_STATUS=$?
  cd ..
  if [ $BACKEND_STATUS -ne 0 ]; then
    echo "  ❌ Error en compilación backend"
  else
    echo "  ✅ Backend OK"
  fi
else
  BACKEND_STATUS=0
fi

# Resumen final
echo ""
if [ $FRONTEND_STATUS -eq 0 ] && [ $BACKEND_STATUS -eq 0 ]; then
  echo "✅ Todos los cambios son válidos"
  exit 0
else
  echo "❌ Hay errores de validación. Revisa arriba."
  exit 1
fi
