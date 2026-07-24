# Stage 1: Build Soroban Smart Contracts
FROM rust:1.80-slim as contract-builder
WORKDIR /app/contract
RUN rustup target add wasm32-unknown-unknown
COPY contract/Cargo.toml contract/Cargo.lock ./
COPY contract/proposal_contract ./proposal_contract
COPY contract/reputation_token ./reputation_token
COPY contract/treasury_contract ./treasury_contract
RUN cargo build --workspace --target wasm32-unknown-unknown --release

# Stage 2: Build React Frontend App
FROM node:20-alpine as frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build

# Stage 3: Serve Frontend static bundle via Nginx
FROM nginx:alpine as runner
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
