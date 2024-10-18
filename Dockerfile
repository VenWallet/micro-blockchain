# Etapa de construcción
FROM node:22-alpine AS builder

# Directorio de trabajo
WORKDIR /app

# Copiar archivos necesarios para instalar dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el código fuente
COPY . .

# Compilar la aplicación
RUN npm run build

# Etapa de producción
FROM node:22-alpine

# Directorio de trabajo en la imagen de producción
WORKDIR /app

# Copiar solo las dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar los artefactos de la etapa de construcción
COPY --from=builder /app/dist ./dist

# Copiar el archivo .env al contenedor
COPY .env .env

# Exponer el puerto en el que la aplicación se ejecutará
EXPOSE 3000

# Ejecutar la aplicación
CMD ["node", "./dist/main.js"]
