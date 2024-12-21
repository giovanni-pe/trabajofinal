# Etapa 1: Construcción
FROM node:20 AS builder

# Establece el directorio de trabajo en el contenedor
WORKDIR /usr/src/app

# Copia el archivo package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias de producción
RUN npm install 

# Copia el resto del código fuente de la aplicación
COPY . .

# Etapa 2: Imagen de ejecución
FROM node:20

# Establece el directorio de trabajo en el contenedor
WORKDIR /usr/src/app

# Copia los archivos de la etapa de construcción
COPY --from=builder /usr/src/app /usr/src/app

# Expone el puerto de la aplicación
EXPOSE 5001

# Establece la variable de entorno para la URL del colector OTLP
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
ENV OTEL_SERVICE_NAME=sales-api

# Comando para iniciar la aplicación
CMD ["node", "app.js"]
