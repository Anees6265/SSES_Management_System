# ==========================================
# Frontend Production Dockerfile (Vite + React + Nginx)
# ==========================================

# Stage 1: Build the React Application
FROM node:20-alpine AS build

WORKDIR /app

# Accept build arguments for Vite environment variables
ARG VITE_API_URL=/api
ARG VITE_ITEG_ATTENDANCE_API_URL=https://api.ssism.org/api
ARG VITE_ITEG_ATTENDANCE_ENDPOINT=/iteg-attendance
ARG VITE_ITEG_ATTENDANCE_STUDENTS_ENDPOINT=/iteg-attendance
ARG VITE_ITEG_ATTENDANCE_API_KEY=iteg-attendance-api-key-2024
ARG VITE_LOGIN_WITH_GOOGLE=/user/google

# Expose args to Vite build environment
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ITEG_ATTENDANCE_API_URL=$VITE_ITEG_ATTENDANCE_API_URL
ENV VITE_ITEG_ATTENDANCE_ENDPOINT=$VITE_ITEG_ATTENDANCE_ENDPOINT
ENV VITE_ITEG_ATTENDANCE_STUDENTS_ENDPOINT=$VITE_ITEG_ATTENDANCE_STUDENTS_ENDPOINT
ENV VITE_ITEG_ATTENDANCE_API_KEY=$VITE_ITEG_ATTENDANCE_API_KEY
ENV VITE_LOGIN_WITH_GOOGLE=$VITE_LOGIN_WITH_GOOGLE

# Install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy source and build bundle
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx Alpine
FROM nginx:alpine

# Remove default nginx html and configuration
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Expose standard HTTP port
EXPOSE 80

# Health check to verify Nginx is serving
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]