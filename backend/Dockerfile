FROM gradle:8.8-jdk21 AS build
WORKDIR /workspace
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src
RUN gradle installDist --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/install/mirage-backend ./
EXPOSE 8080
CMD ["./bin/mirage-backend"]
