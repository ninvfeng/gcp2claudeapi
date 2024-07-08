const MODEL = 'claude-3-5-sonnet@20240620';

const PROJECT_ID = '项目ID';
const CLIENT_ID = '填写';
const CLIENT_SECRET = '填写';
const REFRESH_TOKEN = '填写';

// 你只需要从GCP获取并设置上面四个信息

// 这个设置成你想要的密码
// 相当于你账号的密码功能，接口密钥，用于保护你的接口
const API_KEY = 'sk-pass'

const TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token';

let tokenCache = {
  accessToken: '',
  expiry: 0,
  refreshPromise: null
};

/**
 *
     6/26 更新： 
         ~ 修复请求量大时 accessToken 几率获取失败
            导致accessToken为空值问题
*/
async function getAccessToken() {
  const now = Date.now() / 1000;

  // 如果 token 仍然有效，直接返回
  if (tokenCache.accessToken && now < tokenCache.expiry - 120) {
    return tokenCache.accessToken;
  }

  // 如果已经有一个刷新操作在进行中，等待它完成
  if (tokenCache.refreshPromise) {
    await tokenCache.refreshPromise;
    return tokenCache.accessToken;
  }

  // 开始新的刷新操作
  tokenCache.refreshPromise = (async () => {
    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: REFRESH_TOKEN,
          grant_type: 'refresh_token'
        })
      });

      const data = await response.json();
      
      tokenCache.accessToken = data.access_token;
      tokenCache.expiry = now + data.expires_in;
    } finally {
      tokenCache.refreshPromise = null;
    }
  })();

  await tokenCache.refreshPromise;
  return tokenCache.accessToken;
}

// 选择区域
function getLocation() {
  const currentSeconds = new Date().getSeconds();
  return currentSeconds < 30 ? 'europe-west1' : 'us-east5';
}

// 构建 API URL
function constructApiUrl(location) {
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${location}/publishers/anthropic/models/${MODEL}:streamRawPredict`;
}

// 处理请求
async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }
  // 检查x-api-key
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== API_KEY) {
    const errorResponse = new Response(JSON.stringify({
      type: "error",
      error: {
        type: "permission_error",
        message: "Your API key does not have permission to use the specified resource."
      }
    }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE, HEAD');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version, model');
     
    return errorResponse;
  }


  const accessToken = await getAccessToken();
  const location = getLocation();
  const apiUrl = constructApiUrl(location);

  let requestBody = await request.json();
  
  // 删除原始请求中的"anthropic_version"字段（如果存在）
  if (requestBody.anthropic_version) {
    delete requestBody.anthropic_version;
  }
  
  // 删除原始请求中的"model"字段（如果存在）
  if (requestBody.model) {
    delete requestBody.model;
  }
  
  // 添加新的"anthropic_version"字段
  requestBody.anthropic_version = "vertex-2023-10-16";

  const modifiedHeaders = new Headers(request.headers);
  modifiedHeaders.set('Authorization', `Bearer ${accessToken}`);
  modifiedHeaders.set('Content-Type', 'application/json; charset=utf-8');
  modifiedHeaders.delete('anthropic-version');

  const modifiedRequest = new Request(apiUrl, {
    headers: modifiedHeaders,
    method: request.method,
    body: JSON.stringify(requestBody),
    redirect: 'follow'
  });

  const response = await fetch(modifiedRequest);
  const modifiedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
 
  modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
  modifiedResponse.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version, model');
   
  return modifiedResponse;
}

function handleOptions() {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version, model');

  return new Response(null, {
    status: 204,
    headers: headers
  });
}

export default {
  async fetch(request) {
    return handleRequest(request);
  }
}