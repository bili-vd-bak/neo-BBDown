import * as common from "../common.ts";
// @deno-types="@types/make-fetch-happen"
import mfh from "make-fetch-happen";

const fetch = mfh.defaults({
  cachePath: "./rt-tmp",
});

interface md_res {
  code: 0 | -400 | -404;
  message: "success" | string;
  result: {
    media: {
      season_id: number;
      //...
    };
  };
}

export interface episodes_res {
  aid: number;
  badge: string;
  bvid: string;
  cid: number;
  cover: string;
  duration: number; //视频长度(毫秒ms)
  id: number; //ep_id
  long_title: string; //主标题
  pub_time: number; //发布时间 Unix时间戳 秒
  share_copy: string; //分享标题: 《番剧名》<title> <long_title>
  title: string; //副标题(<集数:num>/OVA/...)
}

export interface detail_res {
  code: 0 | -404;
  message: "success" | string;
  ttl: 1;
  result: {
    title: string;
    episodes: episodes_res[];
    evaluate: string;
    season_title: string;
  };
}

export async function md(media_id: number) {
  const api = "https://api.bilibili.com/pgc/review/user";
  const data = await fetch(
    api + "?media_id=" + media_id,
    common.fetch_config_UA
  )
    .then((res) => res.json())
    .then((res: md_res) => {
      if (res.code === 0 && res.message === "success") return res;
      else throw Error("get mdid failed");
    });
  const season_id = data?.result?.media?.season_id;
  if (season_id) return ss(season_id);
  else throw new Error("get mdid failed");
}

export async function ep(ep_id: number) {
  const api = "https://api.bilibili.com/pgc/view/web/season";
  const data = await fetch(api + "?ep_id=" + ep_id, common.fetch_config_UA)
    .then((res) => res.json())
    .then((res: detail_res) => {
      if (res.code === 0 && res.message === "success") return res;
      else throw new Error("get epid failed");
    });
  return data;
}

export async function ss(season_id: number) {
  const api = "https://api.bilibili.com/pgc/view/web/season";
  const data = await fetch(
    api + "?season_id=" + season_id,
    common.fetch_config_UA
  )
    .then((res) => res.json())
    .then((res: detail_res) => {
      if (res.code === 0 && res.message === "success") return res;
      else throw new Error("get ssid failed");
    });
  return data;
}

export function extractInfo(res: detail_res) {
  function skipSomeEpsInInfoFile(info: episodes_res[]) {
    const eps = [];
    for (let i = 0; i < info?.length; i++) {
      if (info?.[i]?.badge !== "预告") {
        //符合BBDown下载行为：跳过预告、https://github.com/nilaoda/BBDown/commit/53051c92de2ecaa9ce76fc4687ad60ea8937301c
        eps.push(info?.[i]);
      }
    }
    return eps;
  }
  return {
    title: res.result.season_title,
    evaluate: res.result.evaluate,
    episodes: skipSomeEpsInInfoFile(res.result.episodes),
  };
}

export function catID(id: string) {
  const regex = /(md|ep|ss)[0-9]+/gi;
  const result = id.match(regex)?.[0];
  if (!result) throw new Error("catID fail!");
  const type = result.substring(0, 2),
    val = Number(result.substring(2));
  if (!val) throw new Error("invalid ID!");
  let t: string;
  switch (type) {
    case "md":
      t = "md";
      break;
    case "ep":
      t = "ep";
      break;
    case "ss":
      t = "ss";
      break;
    default:
      throw new Error("catID fail!");
    // break;
  }
  return { type: t, id: val };
}

export default async function main(link: string) {
  const id = catID(link);
  let dt_info: detail_res;
  switch (id.type) {
    case "md":
      dt_info = await md(id.id);
      break;
    case "ep":
      dt_info = await ep(id.id);
      break;
    case "ss":
      dt_info = await ss(id.id);
      break;
    default:
      throw new Error("invalid ID!");
    // break;
  }
  if (!dt_info) throw new Error("get info fail!");
  return extractInfo(dt_info);
}

Deno.test({
  name: "info main",
  async fn() {
    const d = await main(
      "https://www.bilibili.com/bangumi/media/md21231359?spm_id_from=..0.0"
    );
    console.log(d);
  },
});
