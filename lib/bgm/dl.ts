// import qs from "qs";
import $ from "@david/dax";
import pako from "pako";
import * as common from "../common.ts";
import { type config_type } from "../config.ts";
import { parser, type dash_unit_res } from "../dash.ts";
import { type episodes_res } from "./info.ts";
import aria2c from "../aria2.ts";
import ffmpeg from "../ffmpeg.ts";
import * as xml2ass from "@biliy-deno/danmaku2ass";
import { print_type } from "../../cli.ts";
import * as bili from "../bili_utils.ts";
// @deno-types="@types/make-fetch-happen"
import mfh from "make-fetch-happen";

const fetch = mfh.defaults({
  cachePath: "./rt-tmp",
});

interface app_res {
  code?: number;
  durl?: object[];
  dash?: dash_unit_res;
}

interface web_res {
  code: number;
  message: string;
  ttl: 1;
  result?: app_res;
  data?: app_res;
}

export interface st_res {
  id: number;
  lan: "zh-CN" | "zh-Hans" | "zh-Hant" | "en" | string;
  lan_doc: string;
  is_lock: boolean;
  subtitle_url: string;
  type: number;
  id_str: string;
  ai_type: number;
  ai_status: number;
}

interface x_v2_res {
  code: number;
  message: string;
  ttl: 1;
  data: {
    subtitle?: {
      subtitles?: st_res[];
    };
  };
}

const qn_expect_col = [32, 64, 74, 80, 112, 116, 120, 125, 126, 127];

enum fnval_list {
  "default" = 16, //启用dash 属性位
  "fb" = 2061, //启用av1 属性位
  "vip_fb2" = 976, //启用HDR、4K、杜比音效、杜比视界 属性位
  "vip_fb1" = 2000, //启用HDR、4K、杜比音效、杜比视界、8K 属性位
  "vip" = 4048, //启用HDR、4K、杜比音效、杜比视界、8K、av1 属性位
}

type fp_type =
  | "videoTitle"
  | "pageNumber"
  | "pageNumberWithZero"
  | "pageTitle"
  | "bvid"
  | "aid"
  | "cid"
  | "dfn"
  | "res"
  | "fps"
  | "videoCodecs"
  | "videoBandwidth"
  | "audioCodecs"
  | "audioBandwidth"
  | "ownerName"
  | "ownerMid"
  | "publishDate"
  | "apiType";
// const fp_params = [
//   "videoTitle",
//   "pageNumber",
//   "pageNumberWithZero",
//   "pageTitle",
//   "bvid",
//   "aid",
//   "cid",
//   "dfn",
//   "res",
//   "fps",
//   "videoCodecs",
//   "videoBandwidth",
//   "audioCodecs",
//   "audioBandwidth",
//   "ownerName",
//   "ownerMid",
//   "publishDate",
//   "apiType",
// ];

export function f(qn: number) {
  return {
    qn: qn_expect_col.includes(qn) ? qn : 32,
    fnval: qn >= 112 ? fnval_list["vip"] : fnval_list["default"],
  };
}

export async function web(
  cid: number,
  avid: number,
  // ep: number,
  qn = 32,
  print: print_type,
  SESSDATA: string,
  cookies?: string
) {
  const api = "https://api.bilibili.com/x/player/wbi/playurl?";
  const basic_param = f(qn);
  const data = await fetch(
    api +
      (await bili.appsign(
        {
          cid,
          avid,
          // ep_id: ep,
          qn: basic_param.qn,
          fnver: 0,
          fnval: basic_param.fnval,
          fourk: 1,
          from_client: "BROWSER",
          drm_tech_type: 2,
        },
        "",
        "",
        SESSDATA
      )),
    {
      headers: {
        "User-Agent": common.UA,
        cookie: `SESSDATA=${SESSDATA};${cookies}`,
      },
    }
  )
    .then((res) => res.json())
    .then((res: web_res) => {
      print.d("playurl(web):", JSON.stringify(res));
      if (res.code === 0 && res.data) return res;
      // if (res.code === 0) return res;
      else throw Error("get playurl(web) failed");
    });
  return data.data;
  // return data;
}

export async function app(
  cid: number,
  avid: number,
  // ep: number,
  qn = 32,
  print: print_type,
  accesskey: string
) {
  const api = "https://api.bilibili.com/pgc/player/api/playurl?";
  const basic_param = f(qn);
  // print.d(
  //   "",
  //   api +
  //     bili.appsign({
  //       accesskey,
  //       ep_id: ep,
  //       qn: basic_param.qn,
  //       fnver: 0,
  //       fnval: basic_param.fnval,
  //       fourk: 1,
  //       from_client: "BROWSER",
  //       drm_tech_type: 2,
  //     })
  // );
  const data = await fetch(
    api +
      (await bili.appsign({
        accesskey,
        cid,
        avid,
        // ep_id: ep,
        qn: basic_param.qn,
        fnver: 0,
        fnval: basic_param.fnval,
        fourk: 1,
        // from_client: "BROWSER",
        // drm_tech_type: 2,
        build: 7490200,
        device: "android",
        mobi_app: "android",
        platform: "android",
      })),
    {
      headers: {
        "User-Agent": common.UA,
      },
    }
  )
    .then((res) => res.json())
    .then((res: app_res) => {
      print.d("playurl(app):", JSON.stringify(res));
      // if (res.code === 0 && res.result) return res;
      if (res.code === 0) return res;
      else throw Error("get playurl(app) failed");
    });
  // return data.result
  return data;
}

async function dm(cid: number) {
  const api = "https://api.bilibili.com/x/v1/dm/list.so";
  const data = $.request(api + "?oid=" + cid)
    .header("User-Agent", common.UA)
    // const data = await fetch(api + "?oid=" + cid, common.fetch_config_UA)
    .then((res) => res.arrayBuffer())
    .then((res) => pako.inflateRaw(res))
    .then((res) => new TextDecoder("utf-8").decode(res));
  return data;
}

async function subtitle(aid: number, cid: number) {
  const api = "https://api.bilibili.com/x/player/v2";
  const data = await fetch(
    api + "?aid=" + aid + "&cid=" + cid,
    common.fetch_config_UA
  )
    .then((res) => res.json())
    .then((res: x_v2_res) => {
      if (
        res.code === 0 &&
        res.data.subtitle?.subtitles &&
        res.data.subtitle.subtitles?.length > 0
      )
        return res || null;
      // else throw new Error("get subtitle failed");
    });
  return data?.data.subtitle?.subtitles;
}

function genFileName(ori_fn: string, fp: { [key: string]: string | number }) {
  let std_fn = ori_fn,
    subtitle_fn = ori_fn;
  for (const [key, value] of Object.entries(fp)) {
    const k = `<${key}>`;
    std_fn = std_fn.replaceAll(k, value + "");
    subtitle_fn = subtitle_fn.replaceAll(
      k,
      [
        "dfn",
        "res",
        "fps",
        "videoCodecs",
        "videoBandwidth",
        "audioCodecs",
        "audioBandwidth",
      ].includes(key)
        ? ""
        : value + ""
    );
  }
  std_fn = common.getValidFileName(std_fn);
  subtitle_fn = common.getValidFileName(subtitle_fn);
  return { std_fn, subtitle_fn };
}

export default function main(
  info: { title: string; evaluate: string; episodes: episodes_res[] },
  api_type: "web" | "app",
  print: print_type,
  config?: config_type
) {
  if (!config) throw new Error("cannot find config");
  // const c = config.rt.cache;
  info.episodes.forEach(async (episode, p_location) => {
    const play_res =
      api_type === "app"
        ? await app(
            episode.cid,
            episode.aid,
            config?.video?.qn,
            print,
            config?.auth?.accesskey as string
          )
        : await web(
            episode.cid,
            episode.aid,
            config?.video?.qn,
            print,
            config?.auth?.SESSDATA as string,
            config?.auth?.cookies
          );
    if (!play_res?.dash)
      throw new Error(
        "no dash stream!" + play_res?.durl ? "获取到durls,也许登录失败？" : ""
      );
    const to_dl = parser(
      play_res.dash,
      config?.video?.qn,
      config?.video?.codecs,
      config?.dl?.pcdn,
      config?.dl?.upos,
      print
    );
    const data_col = {
      videoTitle: info.title,
      pageNumber: p_location,
      pageNumberWithZero: "",
      pageTitle: episode.long_title,
      bvid: episode.bvid,
      aid: episode.aid,
      cid: episode.cid,
      dfn: to_dl.video.qn,
      res: to_dl.video.width + "x" + to_dl.video.height,
      fps: to_dl.video.fps,
      videoCodecs: to_dl.video.codecs,
      videoBandwidth: Math.floor(to_dl.video.bandwidth / 1000),
      audioCodecs: to_dl.audio.codecs,
      audioBandwidth: Math.floor(to_dl.audio.bandwidth / 1000),
      ownerName: "",
      ownerMid: "",
      publishDate: common.formatUnixTimestamp(episode.pub_time),
      apiType: "",
    };
    const fn = genFileName(
      config?.save?.dir || "[<bvid>] <videoTitle>",
      data_col
    );
    print.d("视频数据集：", JSON.stringify(data_col));
    print.p("即将开始下载：", `${episode.share_copy}`);
    print.p("视频/弹幕将保存为：", fn.std_fn);
    print.p("字幕将保存为：", fn.subtitle_fn + ".<地区代号>");
    print.p("清晰度：", to_dl.video.qn);
    print.p("视频编码：", to_dl.video.codecs);
    // print.p("调用aria2c下载：");
    await aria2c(
      to_dl.video.url,
      "./tmp/" + episode.cid,
      "video.m4s",
      "pc",
      config,
      print
    );
    print.p("音频质量：", to_dl.audio.qn);
    print.p("音频编码：", to_dl.audio.codecs);
    await aria2c(
      to_dl.audio.url,
      "./tmp/" + episode.cid,
      "audio.m4s",
      "pc",
      config,
      print
    );
    print.p("保存视频封面：");
    await aria2c(
      episode.cover,
      "./tmp/" + episode.cid,
      "cover.png",
      "pc",
      config,
      print
    );
    if (config?.dl?.danmaku) {
      print.p("保存弹幕中：");
      if (
        $.path(`./${fn.std_fn}.xml`).existsSync() &&
        $.path(`./${fn.std_fn}.ass`).existsSync()
      )
        print.suc("文件存在，跳过。");
      else {
        const d = await dm(episode.cid);
        print.d("弹幕长度及头部：", d.length + ";" + d.substring(0, 1000));
        Deno.writeTextFileSync(`./${fn.std_fn}.xml`, d);
        print.p(
          "提示：",
          "下方弹幕转换会进行去重，'[Warn] Collision'并非报错。"
        );
        Deno.writeTextFileSync(`./${fn.std_fn}.ass`, xml2ass.generateASS(d));
      }
    }
    if (config?.dl?.subtitle) {
      print.p("保存字幕中：");
      const st = await subtitle(episode.aid, episode.cid);
      if (st) {
        print.p("发现字幕数：", st.length);
        st.forEach(async (s) => {
          print.p("下载字幕：", s.lan_doc);
          await aria2c(
            s.subtitle_url,
            "./tmp/" + episode.cid,
            `subtitle.${s.lan}.srt`,
            "pc",
            config,
            print
          );
        });
        print.p("开始合并视频文件：");
        await ffmpeg(
          `./${fn.std_fn}.mp4`,
          { title: info.title, evaluate: info.evaluate, episode },
          "./tmp/" + episode.cid,
          config,
          print,
          st
        );
        return;
      } else print.suc("本集无字幕，跳过。");
    }
    print.p("开始合并视频文件：");
    await ffmpeg(
      `./${fn.std_fn}.mp4`,
      { title: info.title, evaluate: info.evaluate, episode },
      "./tmp/" + episode.cid,
      config,
      print
    );
    return;
  });
}

Deno.test({
  name: "dl",
  async fn() {
    // console.log(await web(819318, 64));
    // const dm_res = await fetch(
    //   "https://comment.bilibili.com/144541892.xml"
    // ).then((res) => res.arrayBuffer());
    // const dm = new TextDecoder("utf-8").decode(pako.inflateRaw(dm_res));
    // const u8 = new Uint8Array(pako.inflateRaw(dm_res));
    // const bytes = new TextEncoder().encode("Hello world");
    // const compressed = deflate(bytes).copyAndDispose();
    // const decompressed = inflate(compressed).copyAndDispose();
    // console.log();
    // Deno.writeFileSync("./dm.xml", pako.inflateRaw(dm_res));
    // Deno.writeTextFileSync("./dm2.ass", xml2ass.generateASS(dm, {}));
    // console.dir(genFileName("<ep>-----<dfn>-----<codecs>"));
  },
});
