import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface OrganizationTree {
  id: string
  name: string
  code: string | null
  level: number
  path: string | null
  parentId: string | null
  isActive: boolean
  children: OrganizationTree[]
  userCount: number
}

export interface OrganizationFilterOptions {
  includeInactive?: boolean
  includeUserCount?: boolean
  maxLevel?: number
}

/**
 * 获取组织架构树形结构
 */
export async function getOrganizationTree(
  parentId: string | null = null,
  options: OrganizationFilterOptions = {}
): Promise<OrganizationTree[]> {
  const {
    includeInactive = false,
    includeUserCount = true,
    maxLevel = 10
  } = options

  const organizations = await prisma.organization.findMany({
    where: {
      parentId,
      isActive: includeInactive ? undefined : true
    },
    orderBy: [
      { level: 'asc' },
      { name: 'asc' }
    ]
  })

  const result: OrganizationTree[] = []

  for (const org of organizations) {
    if (org.level > maxLevel) continue

    const children = org.level < maxLevel
      ? await getOrganizationTree(org.id, options)
      : []

    const userCount = includeUserCount
      ? await getUserCountByOrganization(org.id)
      : 0

    result.push({
      id: org.id,
      name: org.name,
      code: org.code,
      level: org.level,
      path: org.path,
      parentId: org.parentId,
      isActive: org.isActive,
      children,
      userCount
    })
  }

  return result
}

/**
 * 获取用户所属组织的完整路径
 */
export async function getUserOrganizationPath(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: true
    }
  })

  if (!user?.organizationId) {
    return []
  }

  const path = await getOrganizationPath(user.organizationId)
  return path.map(org => org.id)
}

/**
 * 获取组织的完整路径（从根到当前组织）
 */
export async function getOrganizationPath(organizationId: string): Promise<OrganizationTree[]> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId }
  })

  if (!organization) {
    return []
  }

  const path: OrganizationTree[] = []
  let currentOrg: any = organization

  while (currentOrg) {
    const userCount = await getUserCountByOrganization(currentOrg.id)

    path.unshift({
      id: currentOrg.id,
      name: currentOrg.name,
      code: currentOrg.code,
      level: currentOrg.level,
      path: currentOrg.path,
      parentId: currentOrg.parentId,
      isActive: currentOrg.isActive,
      children: [],
      userCount
    })

    if (currentOrg.parentId) {
      currentOrg = await prisma.organization.findUnique({
        where: { id: currentOrg.parentId }
      })
    } else {
      currentOrg = null
    }
  }

  return path
}

/**
 * 获取指定组织的用户数量
 */
export async function getUserCountByOrganization(organizationId: string): Promise<number> {
  // 获取该组织及其所有子组织
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId }
  })

  if (!organization) {
    return 0
  }

  // 构建组织路径查询条件
  const orgPath = organization.path || ''
  const orgLevel = organization.level

  const users = await prisma.user.count({
    where: {
      organizationId,
      isActive: true
    }
  })

  return users
}

/**
 * 检查用户是否有权访问指定组织的资源
 */
export async function canUserAccessOrganization(
  userId: string,
  targetOrganizationId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: true
    }
  })

  if (!user) {
    return false
  }

  // 如果用户没有组织，则不能访问任何组织资源
  if (!user.organizationId) {
    return false
  }

  // 如果是管理员，可以访问所有组织
  const hasAdminAccess = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        code: 'ADMIN',
        isActive: true
      }
    }
  })

  if (hasAdminAccess) {
    return true
  }

  // 如果是部门经理，只能访问自己组织及子组织的资源
  const hasManagerAccess = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        code: 'MANAGER',
        isActive: true
      }
    }
  })

  if (hasManagerAccess) {
    return await isOrganizationInHierarchy(
      user.organizationId,
      targetOrganizationId
    )
  }

  // 普通用户只能访问自己组织的资源
  return user.organizationId === targetOrganizationId
}

/**
 * 检查目标组织是否在用户组织层级中
 */
async function isOrganizationInHierarchy(
  userOrganizationId: string,
  targetOrganizationId: string
): Promise<boolean> {
  if (userOrganizationId === targetOrganizationId) {
    return true
  }

  // 获取用户组织的完整路径
  const userOrgPath = await getOrganizationPath(userOrganizationId)
  const userOrgIds = userOrgPath.map(org => org.id)

  // 获取目标组织的完整路径
  const targetOrgPath = await getOrganizationPath(targetOrganizationId)
  const targetOrgIds = targetOrgPath.map(org => org.id)

  // 检查是否有共同的根组织
  for (const userOrgId of userOrgIds) {
    if (targetOrgIds.includes(userOrgId)) {
      return true
    }
  }

  return false
}

/**
 * 创建数据过滤器，用于Prisma查询
 */
export function createOrganizationFilter(
  userId: string,
  organizationField: string = 'organizationId'
): { [key: string]: any } {
  // 这个函数需要在有用户上下文的情况下使用
  // 返回Prisma查询过滤器
  return {
    [organizationField]: {
      in: async () => {
        const userOrgPath = await getUserOrganizationPath(userId)
        return userOrgPath
      }
    }
  }
}

/**
 * 过滤查询结果，只返回用户有权访问的组织数据
 */
export async function filterByUserOrganization<T extends { organizationId?: string | null }>(
  userId: string,
  data: T[]
): Promise<T[]> {
  if (!userId || data.length === 0) {
    return []
  }

  const accessibleOrgIds = await getUserOrganizationPath(userId)

  return data.filter(item =>
    !item.organizationId ||
    accessibleOrgIds.includes(item.organizationId)
  )
}

/**
 * 获取组织统计信息
 */
export async function getOrganizationStatistics(organizationId?: string) {
  const whereClause = organizationId
    ? { organizationId }
    : {}

  const [
    totalUsers,
    activeUsers,
    totalOrgs,
    activeOrgs
  ] = await Promise.all([
    prisma.user.count({ where: whereClause }),
    prisma.user.count({
      where: {
        ...whereClause,
        isActive: true
      }
    }),
    organizationId
      ? 1 // 如果指定了组织ID，总数为1
      : prisma.organization.count(),
    organizationId
      ? await prisma.organization.count({
          where: {
            id: organizationId,
            isActive: true
          }
        })
      : prisma.organization.count({
          where: { isActive: true }
        })
  ])

  return {
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
    totalOrganizations: organizationId ? 1 : totalOrgs,
    activeOrganizations: organizationId ? (activeOrgs > 0 ? 1 : 0) : activeOrgs,
    inactiveOrganizations: organizationId ? (activeOrgs > 0 ? 0 : 1) : totalOrgs - activeOrgs
  }
}