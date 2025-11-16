-- MySQL 数据库初始化脚本
-- 为会议管理系统创建基础配置

-- 设置时区
SET time_zone = '+08:00';

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS meeting_manage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE meeting_manage;

-- 创建基础用户和权限（Docker环境变量会覆盖这些设置）
-- 这些设置仅作为备用，实际配置由Docker环境变量控制