# ─────────────────────────────────────────────────────────────
# Stage 1 : BUILD
# ─────────────────────────────────────────────────────────────
FROM amazoncorretto:21-alpine AS builder

WORKDIR /app

COPY gradlew .
COPY gradle ./gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew

# Cache dependencies
RUN ./gradlew dependencies --no-daemon || true

# Build fat-jar (tests run in CI separately)
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ─────────────────────────────────────────────────────────────
# Stage 2 : RUN  (lean final image)
# ─────────────────────────────────────────────────────────────
FROM amazoncorretto:21-alpine

WORKDIR /app

# Non-root user (security best practice)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/build/libs/*.jar app.jar
RUN chown appuser:appgroup app.jar
USER appuser

# Port matches server.port in application.properties
EXPOSE 8080

# MIN_HEAP / MAX_HEAP come from Helm envVariables (same pattern as subscriber-event-service)
ENTRYPOINT ["sh", "-c", "java ${MIN_HEAP:--Xms256m} ${MAX_HEAP:--Xmx512m} -jar app.jar"]
