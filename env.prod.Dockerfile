FROM alpine

WORKDIR /www

RUN apk add --no-cache nodejs npm

COPY package.json package-lock.json ./

RUN npm i --verbose

RUN npm i --production --verbose
