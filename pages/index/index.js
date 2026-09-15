// 启动分发页：根据是否存在过敏档案决定去向
const { getProfile } = require('../../utils/profile')

Page({
  onLoad() {
    const profile = getProfile()
    getApp().globalData.profile = profile

    if (profile) {
      // 已有档案 → 进入识别主页面
      wx.switchTab({ url: '/pages/scan/scan' })
    } else {
      // 新用户 → 先做问卷测评
      wx.redirectTo({ url: '/pages/survey/survey' })
    }
  }
})
