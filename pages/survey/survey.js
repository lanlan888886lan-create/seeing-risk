// 过敏风险测评问卷页
const { saveProfile } = require('../../utils/profile')

// "无"类选项，与其它选项互斥
const NONE_OPTIONS = ['无', '无已知食物过敏']
// 第 4 题中触发互斥的特殊值
const NONE_ALLERGEN = '无已知食物过敏'
// 第 4 题中"其他"对应的特殊值（用于判断是否显示自定义输入框）
const OTHER_ALLERGEN = '其他'

Page({
  data: {
    questions: [
      {
        key: 'gender',
        title: '你的性别',
        type: 'radio',
        options: ['男', '女', '不便透露']
      },
      {
        key: 'age',
        title: '你的年龄段',
        type: 'radio',
        options: ['3岁以下', '3-12岁', '13-17岁', '18-40岁', '41-60岁', '60岁以上']
      },
      {
        key: 'history',
        title: '是否有食物过敏史',
        type: 'radio',
        options: ['有', '没有', '不确定']
      },
      {
        key: 'allergens',
        title: '已知食物过敏原（可多选）',
        type: 'multi',
        options: [
          '牛奶', '鸡蛋', '花生', '树坚果', '鱼类', '甲壳类',
          '贝类/软体动物', '大豆', '小麦', '芝麻',
          OTHER_ALLERGEN, NONE_ALLERGEN
        ]
      },
      {
        key: 'reactions',
        title: '是否出现过以下过敏反应（可多选）',
        type: 'multi',
        options: [
          '皮肤瘙痒/荨麻疹', '口唇/面部肿胀', '呕吐/腹泻',
          '喉咙紧缩/呼吸困难', '头晕/意识异常', '严重全身性过敏反应', '无'
        ]
      },
      {
        key: 'family',
        title: '直系亲属是否有过敏史',
        type: 'radio',
        options: ['有', '没有', '不清楚']
      },
      {
        key: 'comorbidity',
        title: '是否有以下过敏性疾病（可多选）',
        type: 'multi',
        options: ['哮喘', '过敏性鼻炎', '湿疹/特应性皮炎', '无']
      },
      {
        key: 'reactionSeverity',
        title: '你过去最严重的一次过敏反应程度是？',
        type: 'radio',
        options: ['轻微', '中等', '严重', '不清楚', '从未发生']
      },
      {
        key: 'allergyConfirmation',
        title: '你的食物过敏是否经过专业确认？',
        type: 'radio',
        options: ['医生诊断', '过敏原检测', '根据症状自行判断', '不确定', '从未确认']
      }
    ],
    answers: {
      gender: '',
      age: '',
      history: '',
      allergens: [],
      otherAllergen: '',
      showOtherInput: false,
      reactions: [],
      family: '',
      comorbidity: [],
      reactionSeverity: '',
      allergyConfirmation: ''
    }
  },

  onOptionTap(e) {
    const { key, type, value } = e.currentTarget.dataset
    const answers = Object.assign({}, this.data.answers)

    if (type === 'radio') {
      answers[key] = value
    } else {
      const isNone = NONE_OPTIONS.includes(value)
      if (isNone) {
        // 选择"无"则清空其它选项；再次点击取消
        answers[key] = answers[key].includes(value) ? [] : [value]
        // 若取消"无已知食物过敏"，不清空 otherAllergen（用户已填的保留）
      } else {
        const list = answers[key].filter(item => !NONE_OPTIONS.includes(item))
        const idx = list.indexOf(value)
        if (idx > -1) {
          list.splice(idx, 1)
        } else {
          list.push(value)
        }
        answers[key] = list
      }
    }

    // 第 4 题的"其他"输入框：选中"其他"才显示；只剩"无"时隐藏
    if (key === 'allergens') {
      answers.showOtherInput = answers.allergens.includes(OTHER_ALLERGEN) &&
        !answers.allergens.includes(NONE_ALLERGEN)
    }

    this.setData({ answers })
  },

  onOtherAllergenInput(e) {
    const answers = Object.assign({}, this.data.answers)
    answers.otherAllergen = e.detail.value || ''
    this.setData({ answers })
  },

  onSubmit() {
    const { questions, answers } = this.data

    for (const q of questions) {
      const val = answers[q.key]
      const empty = q.type === 'radio' ? !val : val.length === 0
      if (empty) {
        wx.showToast({
          title: `请完成：${q.title}`,
          icon: 'none'
        })
        return
      }
    }

    // 第 4 题选"其他"时，必须填写具体内容
    if (answers.allergens.includes(OTHER_ALLERGEN) &&
        !answers.allergens.includes(NONE_ALLERGEN) &&
        !answers.otherAllergen.trim()) {
      wx.showToast({
        title: '请填写其他过敏食物',
        icon: 'none'
      })
      return
    }

    // 生成档案并同步到全局
    const profile = saveProfile(answers)
    getApp().globalData.profile = profile

    wx.showToast({ title: '档案已生成', icon: 'success' })
    setTimeout(() => {
      wx.switchTab({ url: '/pages/scan/scan' })
    }, 800)
  }
})
