# Development Dockerfile
FROM node:18-alpine

WORKDIR /var/www/rxn3d_frontend

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
