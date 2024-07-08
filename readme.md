# 这是一个谷歌GCP Vertex AI转Anthropic官方API的CloudFlare worker脚本

1. 需要先到Vertex AI中启用Claude3.5 Sonnet模型并获取对应参数

``` javascript
const PROJECT_ID = '项目ID';
const CLIENT_ID = '填写';
const CLIENT_SECRET = '填写';
const REFRESH_TOKEN = '填写';
```

2. 到CloudFlare中新建worker，并粘贴worker.js内容，注意修改对应参数

（备注：worker.js脚本内容来源linux.do，请合理使用，如有侵权联系删除）