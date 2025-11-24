# ----------------------------------------------------
# ETAPA 1: BUILD (Compilación)
# CAMBIA ESTA LÍNEA para usar una imagen con JDK 21
# ----------------------------------------------------
FROM maven:3.9.5-eclipse-temurin-21 AS build
# En lugar de maven:3.9.5-eclipse-temurin-17

# 1. Directorio de trabajo en el contenedor
WORKDIR /app

# 2. Copia todo el contexto (incluye ambos POMs y código)
# Esto asegura que el POM padre esté disponible en /app/pom.xml
COPY . .

# 3. CONSTRUIR E INSTALAR EL PROYECTO COMPLETO
# El uso de 'clean install' en el POM raíz asegura que el POM padre (KuHubProject:pom:1.0-SNAPSHOT)
# sea instalado en el repositorio local de Maven del contenedor, resolviendo la dependencia para el módulo 'backend'.
# Esto compilará automáticamente el módulo 'backend' como parte del proceso.
RUN mvn clean install -DskipTests

# ----------------------------------------------------
# ETAPA 2: RUN (Ejecución)
# CAMBIA ESTA LÍNEA para usar JRE 21
# ----------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
# En lugar de eclipse-temurin:17-jre-alpine

WORKDIR /app

EXPOSE 8080

# Define el nombre del JAR:
# El artifactId del módulo hijo es 'backend' y la versión es '1.0-SNAPSHOT'.
# La ruta es relativa a la raíz del build, por lo que está dentro de la carpeta 'backend/target'.
ARG JAR_FILE=backend/target/backend-1.0-SNAPSHOT.jar

# Copia el JAR compilado desde la etapa 'build'
COPY --from=build /app/${JAR_FILE} app.jar

# Comando de arranque
ENTRYPOINT ["java","-jar","/app/app.jar"]