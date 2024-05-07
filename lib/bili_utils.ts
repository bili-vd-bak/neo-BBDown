// deno-lint-ignore-file no-explicit-any
//Next Type Begin
/**
 * Make all properties in T optional
 */
type Partial<T> = {
  [P in keyof T]?: T[P];
};
/**
 * Object of `cookies` from header
 */
type cookies = Partial<{
  [key: string]: string;
}>;
//Next Type End

import qs from "qs";
// 此项目无大数据hash需求，故不用wasm,还可保持edge-runtime兼容性
// import { md5 } from "hash-wasm";
import { md5 } from "hash-wasm";
import * as env from "./common.ts";

// const loggerc = env.logger.child({ action: "调用组件(_bili)" });

const sorted = (params: { [x: string]: any }) => {
  const map = new Map();
  for (const k in params) {
    map.set(k, params[k]);
  }
  const arr = Array.from(map).sort();
  const obj: any = {};
  for (const i in arr) {
    const k = arr[i][0];
    const value = arr[i][1];
    obj[k] = value;
  }
  return obj;
};

/**
 * Bilibili APP/WBI API 签名
 * @param params JSON 原请求数据
 * @param appkey 可不填
 * @param appsec 可不填
 * @param SESSDATA WEB登录数据，输入后签名WBI
 */
export const appsign = async (
  params: { [key: string]: string | number | object },
  appkey = "1d8b6e7d45233436",
  appsec = "560c52ccd288fed045859ed18bffd973",
  SESSDATA = ""
  /**
   * 常用key:
   * 783bbb7264451d82 / 2653583c8873dea268ab9386918b1d65 (Android)
   * 1d8b6e7d45233436 / 560c52ccd288fed045859ed18bffd973 (IOS)
   */
) => {
  let to_return = "";
  if (SESSDATA !== "") {
    params.appkey = appkey;
    params = sorted(params);
    const query = qs.stringify(params);
    const sign = await md5(query + appsec);
    params.sign = sign;
    to_return = qs.stringify(params);
  } else {
    const web_keys = await getWbiKeys({ SESSDATA });
    to_return = encWbi(params, web_keys.img_key, web_keys.sub_key);
  }
  // const log = loggerc.child({
  //   module: "Bilibili APP API 签名",
  // });
  // log.info({});
  // log.debug({ context: to_return });
  return to_return;
};

/**
 * 生成CorrespondPath算法
 */
export const CorrespondPath = async () => {
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "RSA",
      n: "y4HdjgJHBlbaBN04VERG4qNBIFHP6a3GozCl75AihQloSWCXC5HDNgyinEnhaQ_4-gaMud_GF50elYXLlCToR9se9Z8z433U3KjM-3Yx7ptKkmQNAMggQwAVKgq3zYAoidNEWuxpkY_mAitTSRLnsJW-NCTa0bqBFF6Wm1MxgfE",
      e: "AQAB",
    },
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );

  async function getCorrespondPath(timestamp: number) {
    const data = new TextEncoder().encode(`refresh_${timestamp}`);
    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, data)
    );
    return encrypted.reduce(
      (str, c) => str + c.toString(16).padStart(2, "0"),
      ""
    );
  }

  const ts = Date.now();
  const to_return = await getCorrespondPath(ts);
  // const log = loggerc.child({
  //   module: "Bilibili 生成CorrespondPath",
  // });
  // log.info({});
  // log.debug({ context: to_return });
  return to_return;
};

const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
];
// 对 imgKey 和 subKey 进行字符顺序打乱编码
const getMixinKey = (orig: string) =>
  mixinKeyEncTab
    .map((n) => orig[n])
    .join("")
    .slice(0, 32);
// 为请求参数进行 wbi 签名
export function encWbi(
  params: { [key: string]: string | number | object },
  img_key: string,
  sub_key: string
) {
  const mixin_key = getMixinKey(img_key + sub_key),
    curr_time = Math.round(Date.now() / 1000),
    chr_filter = /[!'()*]/g;

  Object.assign(params, { wts: curr_time }); // 添加 wts 字段
  // 按照 key 重排参数
  const query = Object.keys(params)
    .sort()
    .map((key) => {
      // 过滤 value 中的 "!'()*" 字符
      const value = params[key].toString().replace(chr_filter, "");
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");

  const wbi_sign = md5(query + mixin_key); // 计算 w_rid

  return query + "&w_rid=" + wbi_sign;
}
// 获取最新的 img_key 和 sub_key
export async function getWbiKeys({ SESSDATA }: { SESSDATA: string }) {
  const res = await cookies2info({ SESSDATA });
  if (!res || !res.wbi_img || !res.wbi_img.img_url || !res.wbi_img.sub_url)
    return { img_key: "", sub_key: "" };
  const {
    wbi_img: { img_url, sub_url },
  } = res;
  return {
    img_key: img_url.slice(
      img_url.lastIndexOf("/") + 1,
      img_url.lastIndexOf(".")
    ),
    sub_key: sub_url.slice(
      sub_url.lastIndexOf("/") + 1,
      sub_url.lastIndexOf(".")
    ),
  };
}

/**
 * 通过WEB端Cookies获取APP端access_key(IOS APPKEY)
 * @param cookies WEB端Cookies
 */

export const cookies2access_key = async (cookies: {
  SESSDATA: string;
  DedeUserID: string;
  bili_jct: string; //即`csrf token`
}) => {
  // const log = loggerc.child({
  //   module: "通过WEB端Cookies获取APP端access_key(IOS APPKEY)",
  // });
  if (!cookies.SESSDATA || !cookies.DedeUserID || !cookies.bili_jct) {
    // log.info({ status: "Failed: No cookies" });
    return;
  }
  const auth_code = await fetch(
    // 第三方登陆法失效，现使用TV登陆法(会产生登陆信息)
    "https://passport.bilibili.com/x/passport-tv-login/qrcode/auth_code",
    {
      method: "POST",
      body: await appsign(
        { appkey: "783bbb7264451d82", local_id: 0, ts: Date.now() },
        "783bbb7264451d82",
        "2653583c8873dea268ab9386918b1d65"
      ),
      headers: {
        "User-Agent": env.UA,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        // cookie: `DedeUserID=${cookies.DedeUserID}; SESSDATA=${cookies.SESSDATA}`,
      },
    }
  )
    .then((res) => res.json())
    .then(
      (res: {
        code: number;
        message: string;
        ttl: number;
        data?: {
          url: string;
          auth_code: string;
        };
      }) => {
        if (res.code !== 0 || !res?.data?.auth_code) {
          // log.info({ status: "Failed: No auth_code" });
          return;
        }
        return res.data.auth_code;
      }
    );
  if (!auth_code) {
    // log.info({ status: "Failed: No auth_code" });
    return;
  }
  return await fetch(
    "https://passport.bilibili.com/x/passport-tv-login/h5/qrcode/confirm",
    {
      method: "POST",
      body: qs.stringify({ auth_code, build: 7082000, csrf: cookies.bili_jct }),
      headers: {
        "User-Agent": env.UA,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        cookie: `DedeUserID=${cookies.DedeUserID}; SESSDATA=${cookies.SESSDATA}`,
      },
    }
  ).then(
    async () =>
      await fetch(
        "https://passport.bilibili.com/x/passport-tv-login/qrcode/poll",
        {
          method: "POST",
          body: await appsign(
            {
              appkey: "783bbb7264451d82",
              local_id: 0,
              auth_code,
              ts: Date.now(),
            },
            "783bbb7264451d82",
            "2653583c8873dea268ab9386918b1d65"
          ),
          headers: {
            "User-Agent": env.UA,
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
        }
      )
        .then((res) => res.json())
        .then(
          (res: {
            code: number;
            message: string;
            ttl: number;
            data?: {
              access_token: string;
              refresh_token: string;
              expires_in: number;
            };
          }) => {
            if (res.code !== 0 || !res?.data?.access_token) {
              // log.info({ status: "Failed: No access_token" });
              return;
            }
            const to_return = res.data.access_token;
            // log.info({ status: "Success" });
            // log.debug({ context: to_return });
            return to_return;
          }
        )
  );
};

/**
 * 通过access_key查询个人信息
 * @param access_key Bilibili access key \
 * 查询不到，返回为 无会员(0,0)
 */
export const access_key2info = async (access_key: string) => {
  // const log = loggerc.child({
  //   module: "通过access_key查询个人信息",
  // });
  return await fetch(
    "https://app.bilibili.com/x/v2/account/myinfo?" +
      (await appsign({ access_key: access_key, ts: Date.now() })),
    env.fetch_config_UA
  )
    .then((res) => res.json())
    .then((res: { data?: any; code: number }) => {
      let to_return = {
        uid: 0,
        vip_type: 0 as 0 | 1 | 2,
      };
      if (res.code === 0) {
        const data = res.data;
        to_return = {
          uid: Number(data.mid),
          vip_type: Number(data.vip.type) as 0 | 1 | 2, //TODO 没有加类型判断校验
        };
      }
      // log.info({});
      // log.debug({ context: to_return });
      return to_return;
    });
};

/**
 * 通过含access_key及sign的Params查询个人信息
 * @param params 字符串的params，如 ?access_key=xxx&sign=xxx \
 * 查询不到，返回为 无会员(0,0)
 */
export const access_keyParams2info = async (params: string) => {
  // const log = loggerc.child({
  //   module: "通过含access_key及sign的Params查询个人信息",
  // });
  return await fetch(
    "https://app.bilibili.com/x/v2/account/myinfo" + params,
    env.fetch_config_UA
  )
    .then((res) => res.json())
    .then((res: { data?: any; code: number }) => {
      let to_return = {
        uid: 0,
        vip_type: 0 as 0 | 1 | 2,
      };
      if (res.code === 0) {
        const data = res.data;
        to_return = {
          uid: Number(data.mid),
          vip_type: Number(data.vip.type) as 0 | 1 | 2, //TODO 没有加类型判断校验
        };
      }
      // log.info({});
      // log.debug({ context: to_return });
      return to_return;
    });
};

/**
 * 通过cookie查询mid/vip
 * @param cookies Bilibili cookies \
 * 查询不到，返回为 无会员(0,0)
 */
export const cookies2info = async (cookies: { SESSDATA: string }) => {
  // const log = loggerc.child({
  //   module: "通过cookie查询mid/vip",
  // });
  let to_return = {
    uid: 0,
    vip_type: 0 as 0 | 1 | 2,
    wbi_img: {
      img_url: "",
      sub_url: "",
    },
  };
  if (!cookies.SESSDATA) {
    // log.info({ status: "Failed" });
    return to_return;
  }
  return await fetch("https://api.bilibili.com/x/web-interface/nav", {
    headers: {
      "User-Agent": env.UA,
      cookie: "SESSDATA=" + cookies.SESSDATA,
      Referer: "https://www.bilibili.com/",
    },
  })
    .then((res) => res.json())
    .then(
      (res: {
        data?: {
          isLogin: boolean;
          mid: number;
          vipType: 0 | 1 | 2;
          wbi_img: { img_url: string; sub_url: string };
        };
        code: number;
      }) => {
        if (!res.data || res.data.isLogin === false || res.code !== 0)
          return to_return;
        const data = res.data;
        to_return = {
          uid: Number(data.mid),
          vip_type: Number(data.vipType) as 0 | 1 | 2, //TODO 没有加类型判断校验
          wbi_img: data.wbi_img,
        };
        // log.info({});
        // log.debug({ context: to_return });
        return to_return;
      }
    );
};

/**
 * 获取Bilibili网页版Cookies \
 * 默认：游客Cookies \
 * @param link 欲获取Cookies之链接
 */
export const getCookies = async (uri = "https://www.bilibili.com/") => {
  // const log = loggerc.child({
  //   module: "获取Bilibili网页版Cookies(游客)",
  // });
  return await fetch(uri, env.fetch_config_UA)
    .then((res) => {
      //代码来源
      /*本文作者： cylee'贝尔塔猫
      本文链接： https://www.cnblogs.com/CyLee/p/16170228.html
      关于博主： 评论和私信会在第一时间回复。或者直接私信我。
      版权声明： 本博客所有文章除特别声明外，均采用 BY-NC-SA 许可协议。转载请注明出处！*/

      // 获取 cookie
      const cookie = res.headers.get("set-cookie") || "";
      // 清理一下 cookie 的格式，移除过期时间，只保留基础的键值对才能正常使用
      const real_cookie = cookie
        .replace(/(;?)( ?)expires=(.+?);\s/gi, "")
        .replace(/(;?)( ?)path=\/(,?)(\s?)/gi, "")
        .replace(
          /(;?)( ?)domain=(.?)([a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?)/gi,
          ""
        )
        .replace(/,/gi, ";")
        .trim();
      const to_return = real_cookie;
      // log.info({});
      // log.debug({ context: to_return });
      return to_return;
    })
    .catch((err) => console.error(err));
};

export const cookies2usable = (cookies: cookies) => {
  let usable_cookies = "";
  for (const [key, val] of Object.entries(cookies)) {
    usable_cookies += key + "=" + val + ";";
  }
  return usable_cookies;
};
