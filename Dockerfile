# ====== Maven 构建阶段（共享） ======
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /build

# 阿里云 Maven 镜像
RUN mkdir -p /root/.m2 && cat > /root/.m2/settings.xml << 'EOF'
<settings>
  <mirrors>
    <mirror>
      <id>aliyun</id>
      <mirrorOf>central</mirrorOf>
      <url>https://maven.aliyun.com/repository/public</url>
    </mirror>
  </mirrors>
</settings>
EOF

# 先复制 POM 文件，利用 Docker 层缓存加速依赖下载
COPY pom.xml ./
COPY common/pom.xml common/
COPY ticket-service/pom.xml ticket-service/
COPY agent-service/pom.xml agent-service/
COPY gateway-service/pom.xml gateway-service/

# 下载依赖（仅 POM 变化时重新执行）
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn dependency:go-offline -B -q || true

# 复制源码并构建
COPY common/src common/src
COPY ticket-service/src ticket-service/src
COPY agent-service/src agent-service/src
COPY gateway-service/src gateway-service/src

RUN --mount=type=cache,target=/root/.m2/repository \
    mvn package -DskipTests -B -q

# ====== ticket-service 运行阶段 ======
FROM eclipse-temurin:21-jre AS ticket-service

WORKDIR /app
COPY --from=builder /build/ticket-service/target/ticket-service-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-Duser.timezone=Asia/Shanghai", "-XX:MaxRAMPercentage=60.0", "-XX:InitialRAMPercentage=30.0", "-XX:+UseG1GC", "-jar", "app.jar"]

# ====== agent-service 运行阶段 ======
FROM eclipse-temurin:21-jre AS agent-service

WORKDIR /app
COPY --from=builder /build/agent-service/target/agent-service-*.jar app.jar

EXPOSE 8081
ENTRYPOINT ["java", "-Duser.timezone=Asia/Shanghai", "-XX:MaxRAMPercentage=60.0", "-XX:InitialRAMPercentage=30.0", "-XX:+UseG1GC", "-jar", "app.jar"]

# ====== gateway-service 运行阶段 ======
FROM eclipse-temurin:21-jre AS gateway-service

WORKDIR /app
COPY --from=builder /build/gateway-service/target/gateway-service-*.jar app.jar

EXPOSE 9000
ENTRYPOINT ["java", "-Duser.timezone=Asia/Shanghai", "-XX:MaxRAMPercentage=60.0", "-XX:InitialRAMPercentage=30.0", "-XX:+UseG1GC", "-jar", "app.jar"]
