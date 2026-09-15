// 用户过敏档案：存储与风险评分
const PROFILE_KEY = 'userProfile'

// "无"类选项（与新问卷一致）
const NONE_OPTIONS = ['无', '无已知过敏食物', '无已知食物过敏']
// 严重反应关键词（新问卷已经不再使用旧的"呼吸困难/过敏性休克"）
const SEVERE_REACTIONS = ['喉咙紧缩/呼吸困难', '头晕/意识异常', '严重全身性过敏反应']

/**
 * 根据问卷答案计算过敏风险等级
 * 评分规则：
 *  - 有食物过敏史 +3 / 不确定 +1
 *  - 已知过敏原数量 1-2 个 +1，3-4 个 +2，>=5 个 +3
 *  - 出现过严重反应（呼吸困难/过敏性休克）+3，其它反应 +1
 *  - 家族过敏史 +1
 *  - 过敏性疾病（哮喘/鼻炎/湿疹）每种 +1，最多 +2
 *  - 3 岁以下 +1
 * 总分 0-2 低风险，3-5 中风险，>=6 高风险
 */
function computeRisk(answers) {
  let score = 0

  if (answers.history === '有') score += 3
  else if (answers.history === '不确定') score += 1

  const allergenCount = answers.allergens.filter(a => !NONE_OPTIONS.includes(a)).length
  if (allergenCount >= 5) score += 3
  else if (allergenCount >= 3) score += 2
  else if (allergenCount >= 1) score += 1

  const reactions = answers.reactions.filter(r => !NONE_OPTIONS.includes(r))
  if (reactions.some(r => SEVERE_REACTIONS.includes(r))) score += 3
  else if (reactions.length > 0) score += 1

  if (answers.family === '有') score += 1

  const comorbidity = answers.comorbidity.filter(c => !NONE_OPTIONS.includes(c)).length
  score += Math.min(comorbidity, 2)

  if (answers.age === '3岁以下') score += 1

  let riskType = 'low'
  let riskLevel = '低风险'
  if (score >= 6) {
    riskType = 'high'
    riskLevel = '高风险'
  } else if (score >= 3) {
    riskType = 'medium'
    riskLevel = '中风险'
  }

  return { riskType, riskLevel, riskScore: score }
}

/** 保存问卷答案并生成档案 */
function saveProfile(answers) {
  const risk = computeRisk(answers)
  const profile = {
    answers,
    allergens: answers.allergens.filter(a => !NONE_OPTIONS.includes(a)),
    otherAllergen: (answers.otherAllergen || '').trim(),
    reactions: answers.reactions.filter(r => !NONE_OPTIONS.includes(r)),
    reactionSeverity: answers.reactionSeverity || '',
    allergyConfirmation: answers.allergyConfirmation || '',
    riskType: risk.riskType,
    riskLevel: risk.riskLevel,
    riskScore: risk.riskScore,
    updatedAt: Date.now()
  }
  wx.setStorageSync(PROFILE_KEY, profile)
  return profile
}

function getProfile() {
  return wx.getStorageSync(PROFILE_KEY) || null
}

function clearProfile() {
  wx.removeStorageSync(PROFILE_KEY)
}

module.exports = {
  computeRisk,
  saveProfile,
  getProfile,
  clearProfile
}
