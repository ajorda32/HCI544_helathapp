FROM node:22-slim

WORKDIR /app

# Copy package configuration
COPY package.json ./

# Install dependencies using npm instead of pnpm
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the default Vite preview port
EXPOSE 4173

# Run the app using Vite's built-in preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
