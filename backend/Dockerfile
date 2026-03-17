# ETAPA 1: Build
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# 1. Copiamos el POM Padre que está en la raíz
COPY pom.xml .

# 2. Copiamos toda la carpeta del backend
COPY backend/ ./backend/

# 3. Construimos solo el backend, pero con acceso al padre
RUN mvn clean package -pl backend -am -DskipTests

# ETAPA 2: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Ojo aquí: como compilamos desde la raíz, el JAR está dentro de /app/backend/target/
COPY --from=build /app/backend/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xmx768m", "-Xms512m", "-jar", "app.jar"]