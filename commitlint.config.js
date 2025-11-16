module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复bug
        'docs',     // 文档更新
        'style',    // 代码格式（不影响代码运行的变动）
        'refactor', // 重构（既不是新增功能，也不是修改bug的代码变动）
        'perf',     // 性能优化
        'test',     // 增加测试
        'build',    // 构建系统或外部依赖变动
        'ci',       // CI配置文件和脚本的变动
        'chore',    // 构建过程或辅助工具的变动
        'revert',   // 回滚之前的提交
        'release',  // 发布新版本
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        // Epic相关
        'epic-1',
        'epic-2',
        'epic-3',
        'epic-4',
        'epic-5',
        'epic-6',
        'epic-7',

        // 功能模块
        'auth',
        'user',
        'room',
        'reservation',
        'checkin',
        'device',
        'analytics',
        'system',
        'admin',
        'api',
        'ui',
        'config',

        // 技术模块
        'db',
        'cache',
        'docker',
        'eslint',
        'prettier',
        'test',
        'docs',
        'deps',
        'workflow',
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 100],
  },
  prompt: {
    questions: {
      type: {
        description: "选择你正在提交的更改类型：",
      },
      scope: {
        description: "这个更改影响哪个范围？（可选）",
      },
      subject: {
        description: "写一个简短的、命令式的更改描述：",
      },
      body: {
        description: "提供一个更详细的更改描述（可选）：",
      },
      isBreaking: {
        description: "这个更改是否引入了重大更改（breaking changes）？",
      },
      breaking: {
        description: "描述重大更改的影响：",
      },
      isIssueAffected: {
        description: "这个更改是否影响任何未解决的问题？",
      },
      issuesBody: {
        description: "如果问题是受影响的，添加问题编号：",
      },
    },
  },
}