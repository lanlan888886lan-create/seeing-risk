// 用户过敏档案：存储与风险评分
const PROFILE_KEY = 'userProfile'

// "无"类选项（与新问卷一致）
const NONE_OPTIONS = ['无', '无已知过敏食物', '无已知食物过敏']
// 严重反应关键词（新问卷已经不再使用旧的"呼吸困难/过敏性休克"）
const SEVERE_REACTIONS = ['喉咙紧缩/呼吸困难', '头晕/意识异常', '严重全身性过敏反应']
// 问卷中「其他」占位选项（真实过敏原由用户手填）
const OTHER_OPTION = '其他'

/** 任意值 → 干净的字符串数组（过滤 null / undefined / 空串） */
function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(item => item !== null && item !== undefined && item !== '')
  }
  if (value === null || value === undefined || value === '') return []
  return [value]
}

/**
 * 计算最终生效的过敏原列表
 * - 去掉「无」类选项和「其他」占位值
 * - 把用户手填的「其他」内容合并进来（那才是真实过敏原）
 */
function resolveAllergens(answers) {
  const source = answers || {}
  const raw = toArray(source.allergens)
  const custom = typeof source.otherAllergen === 'string' ? source.otherAllergen.trim() : ''

  const list = raw.filter(item => !NONE_OPTIONS.includes(item) && item !== OTHER_OPTION)
  if (custom) {
    if (!list.includes(custom)) list.push(custom)
  } else if (raw.includes(OTHER_OPTION)) {
    // 选了「其他」但没填内容，保留占位，避免用户选择被静默丢掉
    list.push(OTHER_OPTION)
  }
  return list
}

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
  const source = answers || {}
  let score = 0

  if (source.history === '有') score += 3
  else if (source.history === '不确定') score += 1

  const allergenCount = toArray(source.allergens).filter(a => !NONE_OPTIONS.includes(a)).length
  if (allergenCount >= 5) score += 3
  else if (allergenCount >= 3) score += 2
  else if (allergenCount >= 1) score += 1

  const reactions = toArray(source.reactions).filter(r => !NONE_OPTIONS.includes(r))
  if (reactions.some(r => SEVERE_REACTIONS.includes(r))) score += 3
  else if (reactions.length > 0) score += 1

  if (source.family === '有') score += 1

  const comorbidity = toArray(source.comorbidity).filter(c => !NONE_OPTIONS.includes(c)).length
  score += Math.min(comorbidity, 2)

  if (source.age === '3岁以下') score += 1

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

/**
 * 归一化档案对象：字段缺失、类型异常、旧字段名都能得到可用数据
 * （本地缓存里可能还存着旧结构，例如过敏原存在 allergen / allergenList 上）
 * @returns {object|null} 无有效档案时返回 null
 */
function normalizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return null

  const answers = raw.answers && typeof raw.answers === 'object'
    ? Object.assign({}, raw.answers)
    : {}
  answers.allergens = toArray(answers.allergens)
  answers.reactions = toArray(answers.reactions)
  answers.comorbidity = toArray(answers.comorbidity)

  // 兼容旧字段名：顶层 allergen / allergenList / allergens
  if (answers.allergens.length === 0) {
    answers.allergens = toArray(raw.allergenList || raw.allergen || raw.allergens)
  }
  if (!answers.otherAllergen && raw.otherAllergen) {
    answers.otherAllergen = String(raw.otherAllergen)
  }
  if (typeof answers.otherAllergen !== 'string') answers.otherAllergen = ''

  // 风险等级：老档案缺字段时按当前规则重算
  const needCompute = !raw.riskLevel || !raw.riskType || typeof raw.riskScore !== 'number'
  const risk = needCompute ? computeRisk(answers) : null

  return {
    answers,
    allergens: resolveAllergens(answers),
    otherAllergen: answers.otherAllergen.trim(),
    reactions: answers.reactions.filter(r => !NONE_OPTIONS.includes(r)),
    reactionSeverity: raw.reactionSeverity || answers.reactionSeverity || '',
    allergyConfirmation: raw.allergyConfirmation || answers.allergyConfirmation || '',
    riskType: risk ? risk.riskType : raw.riskType,
    riskLevel: risk ? risk.riskLevel : raw.riskLevel,
    riskScore: risk ? risk.riskScore : raw.riskScore,
    updatedAt: raw.updatedAt || Date.now()
  }
}

/** 保存问卷答案并生成档案 */
function saveProfile(answers) {
  const source = answers || {}
  const profile = normalizeProfile({
    answers: source,
    otherAllergen: source.otherAllergen,
    updatedAt: Date.now()
  })

  wx.setStorageSync(PROFILE_KEY, profile)
  return profile
}

/** 读取档案（顺带修复旧的 / 不完整的数据并回写本地缓存） */
function getProfile() {
  const raw = wx.getStorageSync(PROFILE_KEY)
  const profile = normalizeProfile(raw)
  if (!profile) return null

  try {
    if (JSON.stringify(raw) !== JSON.stringify(profile)) {
      wx.setStorageSync(PROFILE_KEY, profile)
    }
  } catch (e) {
    // 回写失败不影响读取结果
  }
  return profile
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
