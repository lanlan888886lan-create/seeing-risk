// app.js
const { getProfile } = require('./utils/profile')

App({
  onLaunch() {
    // 启动时加载本地过敏档案
    this.globalData.profile = getProfile()
  },
  globalData: {
    profile: null
  }
})
