FROM node:22.23.4-bookworm
WORKDIR /app
COPY . .
COPY package.json ./
RUN npm install -g pnpm
RUN pnpm install
CMD ["pnpm", "run", "rebuild"]
