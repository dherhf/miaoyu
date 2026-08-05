# ====== Maven 构建阶段（共享） ======
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /build

# 先复制 POM 文件，利用 Docker 层缓存加速依赖下载
COPY pom.xml ./
COPY ticket-service/pom.xml ticket-service/
COPY agent-service/pom.xml agent-service/
COPY gateway-service/pom.xml gateway-service/

# 下载依赖（仅 POM 变化时重新执行）
RUN mvn dependency:go-offline -B -q || true

# 复制源码并构建
COPY ticket-service/src ticket-service/src
COPY agent-service/src agent-service/src
COPY gateway-service/src gateway-service/src

RUN mvn package -DskipTests -B -q

# ====== ticket-service 运行阶段 ======
FROM eclipse-temurin:21-jre AS ticket-service

WORKDIR /app
COPY --from=builder /build/ticket-service/target/ticket-service-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-Xmx300m", "-Xms150m", "-XX:+UseG1GC", "-jar", "app.jar"]

# ====== agent-service 运行阶段 ======
FROM eclipse-temurin:21-jre AS agent-service

WORKDIR /app
COPY --from=builder /build/agent-service/target/agent-service-*.jar app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-Xmx300m", "-Xms150m", "-XX:+UseG1GC", "-jar", "app.jar"]

# ====== gateway-service 运行阶段 ======
FROM eclipse-temurin:21-jre AS gateway-service

WORKDIR /app
COPY --from=builder /build/gateway-service/target/gateway-service-*.jar app.jar

EXPOSE 9000
ENTRYPOINT ["java", "-Xmx200m", "-Xms100m", "-XX:+UseG1GC", "-jar", "app.jar"]
