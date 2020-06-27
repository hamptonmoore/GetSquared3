FROM node:10-alpine3.9 as npmpackages
WORKDIR /app
COPY package.json .
RUN npm install

FROM node:10-alpine3.9 as builder
WORKDIR /app
COPY --from=npmpackages /app /app
COPY . .

CMD ["npm", "run", "start"]

EXPOSE 8082
