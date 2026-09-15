// 我的过敏档案页
const { getProfile, clearProfile } = require('../../utils/profile')

Page({
  data: {
    profile: null
  },

  onShow() {
    this.setData({
      profile: getProfile()
    })
  },

  // 重新测评
  retakeSurvey() {
    wx.navigateTo({ url: '/pages/survey/survey' })
  },

  // 清空档案
  clearProfile() {
    wx.showModal({
      title: '清空档案',
      content: '清空后需要重新完成问卷测评，确定清空吗？',
      confirmText: '清空',
      confirmColor: '#d93025',
      success: (res) => {
        if (res.confirm) {
          clearProfile()
          getApp().globalData.profile = null
          wx.redirectTo({ url: '/pages/survey/survey' })
        }
      }
    })
  },

  goScan() {
    wx.switchTab({ url: '/pages/scan/scan' })
  }
})
