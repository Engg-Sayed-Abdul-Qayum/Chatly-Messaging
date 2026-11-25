FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm install
COPY . .
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000 CLIENT_ORIGIN=*
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm install --omit=dev
COPY server ./server
COPY --from=build /app/client/dist ./client/dist
RUN mkdir -p uploads
EXPOSE 4000
CMD ["npm","run","start","-w","server"]
