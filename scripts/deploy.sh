#!/bin/bash

# 会议管理系统部署脚本
# 使用方法: ./scripts/deploy.sh [环境] [版本]
# 环境可以是: staging, production
# 版本可选，默认使用当前时间戳

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."

    local deps=("docker" "docker-compose" "git" "curl")
    for dep in "${deps[@]}"; do
        if ! command -v $dep &> /dev/null; then
            log_error "缺少依赖: $dep"
            exit 1
        fi
    done

    log_success "依赖检查通过"
}

# 参数验证
validate_args() {
    if [ -z "$1" ]; then
        log_error "请指定环境 (staging|production)"
        echo "使用方法: $0 <environment> [version]"
        exit 1
    fi

    if [[ "$1" != "staging" && "$1" != "production" ]]; then
        log_error "无效的环境: $1"
        exit 1
    fi

    ENVIRONMENT=$1
    VERSION=${2:-$(date +%Y%m%d%H%M%S)}

    log_info "部署环境: $ENVIRONMENT"
    log_info "部署版本: $VERSION"
}

# 备份当前版本
backup_current() {
    log_info "备份当前版本..."

    local backup_dir="./backups/$ENVIRONMENT/$(date +%Y%m%d)/$VERSION"
    mkdir -p "$backup_dir"

    # 备份数据库
    if docker-compose -f docker-compose.prod.yml ps mysql | grep -q "Up"; then
        log_info "备份MySQL数据库..."
        docker-compose -f docker-compose.prod.yml exec mysql \
            mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --all-databases \
            > "$backup_dir/mysql_backup.sql"
    fi

    # 备份Redis
    if docker-compose -f docker-compose.prod.yml ps redis | grep -q "Up"; then
        log_info "备份Redis数据..."
        docker-compose -f docker-compose.prod.yml exec redis \
            redis-cli BGSAVE
        cp "./docker/redis/data/dump.rdb" "$backup_dir/" 2>/dev/null || true
    fi

    log_success "备份完成: $backup_dir"
}

# 拉取最新代码
pull_code() {
    log_info "拉取最新代码..."

    git fetch origin
    git pull origin main

    log_success "代码更新完成"
}

# 构建镜像
build_images() {
    log_info "构建Docker镜像..."

    # 构建应用镜像
    docker build -f Dockerfile.prod -t meeting-manage:$VERSION .

    # 标记为最新版本
    docker tag meeting-manage:$VERSION meeting-manage:latest

    log_success "镜像构建完成"
}

# 部署服务
deploy_services() {
    log_info "部署服务..."

    # 设置环境变量
    export VERSION=$VERSION
    export ENVIRONMENT=$ENVIRONMENT

    # 停止旧服务（保留数据库）
    log_info "停止应用服务..."
    docker-compose -f docker-compose.prod.yml stop app nginx

    # 启动数据库服务（如果未运行）
    log_info "启动基础服务..."
    docker-compose -f docker-compose.prod.yml up -d mysql redis

    # 等待数据库就绪
    log_info "等待数据库就绪..."
    sleep 30

    # 运行数据库迁移
    log_info "执行数据库迁移..."
    docker-compose -f docker-compose.prod.yml run --rm app \
        npm run db:migrate:prod

    # 启动应用服务
    log_info "启动应用服务..."
    docker-compose -f docker-compose.prod.yml up -d app nginx

    log_success "服务部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost/api/health >/dev/null 2>&1; then
            log_success "应用健康检查通过"
            return 0
        fi

        log_warning "健康检查失败，重试 $attempt/$max_attempts..."
        sleep 10
        ((attempt++))
    done

    log_error "健康检查失败，部署可能存在问题"
    return 1
}

# 清理旧版本
cleanup() {
    log_info "清理旧版本..."

    # 删除旧镜像（保留最近3个版本）
    docker images meeting-manage --format "table {{.Repository}}:{{.Tag}}" | \
        grep -v latest | tail -n +4 | \
        awk '{print $1}' | xargs -r docker rmi

    # 清理旧备份（保留最近7天）
    find ./backups/$ENVIRONMENT -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

    log_success "清理完成"
}

# 部署通知
notify() {
    log_info "发送部署通知..."

    # 这里可以添加Slack、邮件等通知
    # curl -X POST -H 'Content-type: application/json' \
    #     --data '{"text":"✅ 会议管理系统已成功部署到'$ENVIRONMENT'环境，版本:'$VERSION'"}' \
    #     YOUR_SLACK_WEBHOOK_URL

    log_success "部署通知已发送"
}

# 回滚功能
rollback() {
    local backup_version=$1
    log_warning "开始回滚到版本: $backup_version"

    # 这里可以实现回滚逻辑
    # 1. 恢复数据库
    # 2. 切换到旧镜像
    # 3. 重启服务

    log_error "回滚功能待实现"
}

# 主函数
main() {
    log_info "开始部署会议管理系统..."
    log_info "时间: $(date)"

    # 检查是否是root用户
    if [ "$EUID" -ne 0 ]; then
        log_warning "建议使用root用户执行此脚本"
    fi

    # 检查是否在项目根目录
    if [ ! -f "package.json" ]; then
        log_error "请在项目根目录执行此脚本"
        exit 1
    fi

    # 解析参数
    if [ "$1" = "rollback" ]; then
        rollback "$2"
        exit 0
    fi

    validate_args "$1" "$2"
    check_dependencies
    backup_current
    pull_code
    build_images
    deploy_services

    if health_check; then
        cleanup
        notify
        log_success "🎉 部署成功完成！"
        log_info "环境: $ENVIRONMENT"
        log_info "版本: $VERSION"
    else
        log_error "❌ 部署失败，请检查日志"
        exit 1
    fi
}

# 脚本入口
main "$@"