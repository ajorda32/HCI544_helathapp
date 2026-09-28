FROM node:22-slim

WORKDIR /app

# Copy package configuration
COPY package.json ./

# Install dependencies using npm instead of pnpm
RUN npm install

# Copy the rest of the application code
COPY . .

# Accept build arguments for environment variables
ARG VITE_GEMINI_API_KEY
ARG VITE_ENVIRONMENT_ID

# Expose them as environment variables during the build
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_ENVIRONMENT_ID=$VITE_ENVIRONMENT_ID

# Build the application
RUN npm run build

# Set PORT to match EXPOSE, since vite.config.ts defaults to 8443
ENV PORT=4173

# Expose the default Vite preview port
EXPOSE 4173

# Run the app using Vite's built-in preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
