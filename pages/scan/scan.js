// 食物识别页：拍照/上传 + AI 过敏风险分析
const { analyzeFood } = require('../../utils/api')
const { getProfile } = require('../../utils/profile')

Page({
  data: {
    imagePath: '',
    analyzing: false,
    result: null,
    profile: null
  },

  onShow() {
    // 每次进入刷新档案（可能在档案页被修改）
    this.setData({
      profile: getProfile()
    })
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          imagePath: res.tempFiles[0].tempFilePath,
          result: null
        })
      },
      fail: (err) => {
        console.log('选择图片失败：', err)
      }
    })
  },

  // 开始 AI 分析
  analyzeFood() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    if (!this.data.profile) {
      wx.showModal({
        title: '尚未建立过敏档案',
        content: '请先完成过敏风险测评，AI 才能结合你的档案分析',
        confirmText: '去测评',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/survey/survey' })
          }
        }
      })
      return
    }

    this.setData({ analyzing: true, result: null })
    wx.showLoading({ title: 'AI 分析中...', mask: true })

    const done = () => {
      wx.hideLoading()
      this.setData({ analyzing: false })
    }

    this.compressAndRead()
      .then(({ base64, mimeType }) => {
        return analyzeFood({
          imageBase64: base64,
          mimeType,
          profile: this.data.profile
        })
      })
      .then((result) => {
        this.setData({ result })
        done()
      })
      .catch((err) => {
        console.error('分析失败：', err)
        wx.showToast({
          title: err.message || '分析失败，请重试',
          icon: 'none'
        })
        done()
      })
  },

  // 压缩图片并读取为 base64
  compressAndRead() {
    return new Promise((resolve, reject) => {
      const read = (filePath) => {
        wx.getFileSystemManager().readFile({
          filePath,
          encoding: 'base64',
          success: (r) => {
            resolve({
              base64: r.data,
              mimeType: this.getMimeType(filePath)
            })
          },
          fail: () => reject(new Error('图片读取失败'))
        })
      }

      wx.compressImage({
        src: this.data.imagePath,
        quality: 60,
        success: (r) => read(r.tempFilePath),
        fail: () => read(this.data.imagePath) // 压缩失败用原图兜底
      })
    })
  },

  getMimeType(filePath) {
    const ext = (filePath.split('.').pop() || '').toLowerCase()
    const map = {
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp'
    }
    return map[ext] || 'image/jpeg'
  },

  goSurvey() {
    wx.navigateTo({ url: '/pages/survey/survey' })
  }
})
