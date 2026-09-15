// AI 接口配置
// 注意：apiKey 直接放在小程序前端存在泄露风险，正式环境建议通过自有后端中转调用
module.exports = {
  ai: {
    baseUrl: 'https://maas-api.cmhk.com/v1',
    apiKey: 'sk-sxpfjggoakyipxhppfdpbwztxohdiebqnazemihwrgemxdex',
    model: 'CM-Pub-Qwen3.5-122B'
  }
}
