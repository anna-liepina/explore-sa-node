FROM alpine AS exploreme

WORKDIR /www

RUN apk add --no-cache nodejs npm

COPY package.json package-lock.json ./