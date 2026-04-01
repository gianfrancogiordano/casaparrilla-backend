#!/bin/bash
# ==============================================================================
# AWS EC2 User Data Script - Casa Parrilla Backend
# ==============================================================================
# Este script se ejecuta automáticamente como root al lanzar la instancia EC2.
# DEBES REEMPLAZAR LAS VARIABLES DE ABAJO ANTES DE PEGARLO EN AWS.
# ==============================================================================

# 1. VARIABLES (¡REEMPLAZAR ESTO!)
GITHUB_TOKEN="tghp_TU_TOKEN_DE_GITHUB_AQUI"
GITHUB_USER="TU_USUARIO_AQUI"
REPO_NAME="casa-parrilla" # Cambiar si tu repo se llama distinto
DOMAIN_NAME="api.tudominio.com"
CERT_EMAIL="tu-correo@ejemplo.com"

# Variables de Entorno del Backend
MONGODB_URI="mongodb+srv://..."
JWT_SECRET="tu-secreto-super-seguro"
FRONTEND_URL="https://tu-app.amplifyapp.com"

# ==============================================================================

echo "🚀 Iniciando despliegue de Casa Parrilla..."
cd /home/ubuntu

# 2. Actualizar sistema e instalar dependencias base
apt-get update -y
apt-get upgrade -y
apt-get install -y git curl certbot python3-certbot-nginx nginx

# 3. Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu
curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. Clonar el repositorio usando el Token de Acceso Personal (PAT)
echo "📥 Clonando repositorio..."
git clone https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git
cd ${REPO_NAME}/backend

# 5. Crear archivo .env para NestJS
cat <<EOF > .env
PORT=3000
MONGODB_URI=${MONGODB_URI}
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=${FRONTEND_URL}
EOF

# 6. Levantar la aplicación con Docker
echo "🐳 Levantando contenedores..."
# Suponiendo que el docker-compose.yml y Dockerfile ya están creados en la carpeta /backend
docker-compose up -d --build

# 7. Configurar Nginx como Reverse Proxy (Redirecciona 80 a 3000)
echo "🌐 Configurando Nginx..."
cat <<EOF > /etc/nginx/sites-available/casaparrilla
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Habilitar el sitio y borrar el default
ln -s /etc/nginx/sites-available/casaparrilla /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

# ==============================================================================
# 8. Generar Certificado SSL (Certbot)
# NOTA: Para que esto funcione automáticamente, el dominio YA DEBE APUNTAR
# a la IP de esta instancia EC2 en tus registros DNS (A Record). 
# Si el DNS no está listo cuando el EC2 se enciende, Certbot fallará.
# ==============================================================================
echo "🔒 Obteniendo certificado SSL..."
certbot --nginx -d ${DOMAIN_NAME} --non-interactive --agree-tos -m ${CERT_EMAIL} --redirect

echo "✅ Despliegue completado!"
