FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package configuration
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN pnpm run build

# Expose the default Vite preview port
EXPOSE 4173

# Run the app using Vite's built-in preview server
CMD ["pnpm", "run", "preview", "--", "--host", "0.0.0.0"]
