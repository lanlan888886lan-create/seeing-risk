// AI 食物过敏风险识别接口封装
const config = require('./config')

function buildPrompt(profile) {
  const allergens = profile && profile.allergens && profile.allergens.length
    ? profile.allergens.join('、')
    : '无已知过敏食物'
  const riskLevel = profile ? profile.riskLevel : '未知'

  const system = [
    '你是一名食物过敏风险识别助手，能够识别图片中的食物及其常见配料，并评估过敏风险。',
    '请严格只返回一个 JSON 对象，不要输出任何其他文字或 Markdown 代码块，字段如下：',
    '{"foodName":"食物名称","ingredients":"主要配料，用、分隔","allergens":"食物中的潜在过敏原，用、分隔，没有则填 无","riskType":"high|medium|low","riskLevel":"高风险|潜在风险|低风险","conflict":"与用户过敏档案冲突的过敏原，用、分隔，没有则填 无","reason":"风险说明，50字以内","advice":"给用户的建议，50字以内"}',
    'riskType 判定规则：食物中明确含有用户过敏档案中的过敏原判 high；含有常见高风险过敏原但不在用户档案中判 medium；基本安全判 low。'
  ].join('\n')

  const user = `我的过敏档案：已知过敏食物【${allergens}】，过敏风险等级【${riskLevel}】。请识别图片中的食物，并评估对我的过敏风险。`

  return { system, user }
}

function parseResult(content) {
  if (typeof content !== 'string' || !content) {
    throw new Error('AI 返回内容异常')
  }
  // 兼容模型可能输出的 Markdown 代码块或多余文字
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('AI 未返回有效结果')
  }
  const data = JSON.parse(match[0])
  return {
    foodName: data.foodName || '未知食物',
    ingredients: data.ingredients || '未知',
    allergens: data.allergens || '无',
    riskType: ['high', 'medium', 'low'].includes(data.riskType) ? data.riskType : 'low',
    riskLevel: data.riskLevel || '低风险',
    conflict: data.conflict || '无',
    reason: data.reason || '暂无说明',
    advice: data.advice || '如有不适请及时就医'
  }
}

/**
 * 调用 AI 接口分析食物图片
 * @param {object} options
 * @param {string} options.imageBase64 图片 base64（不含前缀）
 * @param {string} options.mimeType 图片 MIME 类型
 * @param {object|null} options.profile 用户过敏档案
 * @returns {Promise<object>} 分析结果
 */
function analyzeFood({ imageBase64, mimeType, profile }) {
  const prompt = buildPrompt(profile)

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${config.ai.baseUrl}/chat/completions`,
      method: 'POST',
      timeout: 60000,
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`
      },
      data: {
        model: config.ai.model,
        messages: [
          {
            role: 'system',
            content: [{ type: 'text', text: prompt.system }]
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt.user },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` }
              }
            ]
          }
        ]
      },
      success(res) {
        if (res.statusCode !== 200) {
          reject(new Error(`AI 服务异常（${res.statusCode}）`))
          return
        }
        try {
          const choices = res.data && res.data.choices
          const content = choices && choices[0] && choices[0].message && choices[0].message.content
          resolve(parseResult(content))
        } catch (e) {
          reject(e)
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

module.exports = {
  analyzeFood
}
