FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY package.json .
RUN npm install

COPY config ./config
COPY entrypoint.sh create-admin.mjs ./
RUN chmod +x entrypoint.sh

RUN mkdir -p extensions themes media public

# Fail the image build if webpack compile does not produce client manifests
RUN npx evershop build \
  && test -f /app/.evershop/build/admin/adminLogin/client/index.json

ENTRYPOINT ["./entrypoint.sh"]
