# FROM node:18-alpine

# WORKDIR /app

# # Install dependencies
# COPY package.json package-lock.json ./
# RUN npm install

# # Copy source & build
# COPY . .
# RUN npm run build

# # Allow base URL override at build time
# ARG API_BASE_URL
# ENV REACT_APP_API_URL=$API_BASE_URL

# RUN npm run build

# # Install simple static server
# RUN npm install -g serve

# EXPOSE 8080
# CMD ["serve", "-s", "build", "-l", "8080"]


# 1) Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Serve stage
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/build ./build
COPY package*.json ./
RUN npm ci --production
EXPOSE 8080
CMD ["npm", "start"]
