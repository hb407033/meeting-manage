import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

/**
 * 解析CSV内容为数组
 */
export function parseCSV(csvContent: string): any[] {
  if (!csvContent.trim()) {
    return []
  }

  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    return [] // 至少需要标题行和一行数据
  }

  // 解析标题行
  const headers = parseCSVLine(lines[0])
  const data = []

  // 解析数据行
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    // 如果列数不匹配，跳过该行
    if (values.length !== headers.length) {
      continue
    }

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    data.push(row)
  }

  return data
}

/**
 * 解析CSV行，处理引号和逗号
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的引号
        current += '"'
        i += 2
        continue
      } else {
        // 切换引号状态
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }

    i++
  }

  // 添加最后一个字段
  result.push(current.trim())

  return result
}

/**
 * 验证CSV数据
 */
export async function validateCSVData(
  data: any[],
  schema: z.ZodSchema,
  prisma: PrismaClient
): Promise<{
  isValid: boolean
  validRows: any[]
  errors: Array<{ row: number; field: string; message: string; data: any }>
}> {
  const validRows: any[] = []
  const errors: Array<{ row: number; field: string; message: string; data: any }> = []

  // 获取现有会议室名称用于重复性检查
  const existingRooms = await prisma.meetingRoom.findMany({
    where: { deletedAt: null },
    select: { name: true }
  })
  const existingNames = existingRooms.map(room => room.name.toLowerCase())

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNum = i + 2 // CSV行号（从1开始，加上标题行）

    try {
      // 验证必填字段
      if (!row.name || row.name.trim() === '') {
        errors.push({
          row: rowNum,
          field: 'name',
          message: '会议室名称不能为空',
          data: row
        })
        continue
      }

      // 检查名称重复
      if (existingNames.includes(row.name.trim().toLowerCase())) {
        errors.push({
          row: rowNum,
          field: 'name',
          message: '会议室名称已存在',
          data: row
        })
        continue
      }

      // 验证容量
      const capacity = parseInt(row.capacity)
      if (isNaN(capacity) || capacity < 1) {
        errors.push({
          row: rowNum,
          field: 'capacity',
          message: '容量必须是大于0的整数',
          data: row
        })
        continue
      }

      // 验证状态值
      if (row.status) {
        const validStatuses = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED', 'DISABLED']
        if (!validStatuses.includes(row.status.toUpperCase())) {
          errors.push({
            row: rowNum,
            field: 'status',
            message: `状态必须是以下值之一: ${validStatuses.join(', ')}`,
            data: row
          })
          continue
        }
      }

      // 验证JSON字段
      const jsonFields = ['equipment', 'images', 'rules']
      for (const field of jsonFields) {
        if (row[field] && row[field].trim()) {
          try {
            JSON.parse(row[field])
          } catch {
            errors.push({
              row: rowNum,
              field,
              message: `${field} 字段必须是有效的JSON格式`,
              data: row
            })
            continue
          }
        }
      }

      // 使用schema验证
      const validatedData = schema.parse({
        ...row,
        capacity,
        status: row.status ? row.status.toUpperCase() : 'AVAILABLE',
        requiresApproval: row.requiresApproval === 'true' || row.requiresApproval === '1'
      })

      validRows.push(validatedData)

    } catch (error) {
      errors.push({
        row: rowNum,
        field: 'general',
        message: error.message || '数据验证失败',
        data: row
      })
    }
  }

  return {
    isValid: errors.length === 0,
    validRows,
    errors
  }
}

/**
 * 生成CSV内容
 */
export function generateCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return ''
  }

  // 获取所有字段名作为标题
  const headers = Object.keys(data[0])

  // 生成标题行
  const csvLines = [headers.join(',')]

  // 生成数据行
  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header] || ''

      // 处理包含逗号或引号的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        // 转义内部引号
        value = value.replace(/"/g, '""')
        // 用引号包围
        value = `"${value}"`
      }

      return value
    })

    csvLines.push(values.join(','))
  }

  return csvLines.join('\n')
}

/**
 * 生成CSV模板
 */
export function generateCSVTemplate(): string {
  const template = [
    'name,description,capacity,location,equipment,images,status,rules,requiresApproval',
    '会议室A,小型会议室,10,1楼,"{""projector"": true, ""whiteboard"": true}", """",AVAILABLE,"{""requiresApproval"": false}",false',
    '会议室B,大型会议室,50,2楼,"{""projector"": true, ""videoConf"": true, ""airCondition"": true}", """",MAINTENANCE,"{""requiresApproval"": true}",true'
  ].join('\n')

  return template
}

/**
 * 创建CSV模板下载API
 */
export function createCSVTemplateResponse() {
  const template = generateCSVTemplate()

  return new Response(template, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="meeting-rooms-template.csv"'
    }
  })
}