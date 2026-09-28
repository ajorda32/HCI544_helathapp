# Stage 1: Build the applications
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm for building
RUN npm install -g pnpm

# Copy package dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# Copy application code
COPY . .

# 1. Build the Patient App (Served at the root /)
ENV VITE_APP_MODE=patient
ENV VITE_BASE_URL=/
RUN pnpm run build
RUN mv dist dist-patient

# 2. Build the Provider App (Served at /provider/)
ENV VITE_APP_MODE=provider
ENV VITE_BASE_URL=/provider/
RUN pnpm run build
RUN mv dist dist-provider

# Stage 2: Serve the apps using NGINX
FROM nginx:alpine

# Copy the custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built patient app to the root path
COPY --from=builder /app/dist-patient /usr/share/nginx/html/patient

# Copy the built provider app to the provider path
COPY --from=builder /app/dist-provider /usr/share/nginx/html/provider

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
