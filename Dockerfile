FROM node:22.23.4-bookworm
WORKDIR /app
COPY . .
COPY package.json ./
RUN npm install -g pnpm@9.15.9
RUN pnpm install
CMD ["pnpm", "run", "rebuild"]
