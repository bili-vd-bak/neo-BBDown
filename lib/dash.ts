import { print_type } from "../cli.ts";
import { config_type } from "./config.ts";

enum qn_list {
  //video
  // "240P 极速" = 6,
  // "360P 流畅" = 16,
  "480P 清晰" = 32, //no login
  "720P 高清" = 64, //login
  "720P60 高帧率" = 74,
  "1080P 高清" = 80,
  "1080P+ 高码率" = 112, //vip
  "1080P60 高帧率" = 116,
  "4K 超清" = 120,
  "HDR 真彩色" = 125,
  "杜比视界" = 126,
  "8K 超高清" = 127,
  //audio
  "64K" = 30216,
  "132K" = 30232,
  "192K" = 30280,
  "杜比全景声" = 30250,
  "Hi-Res无损" = 30251,
}

// type mime_type = "video/mp4";
// type codecs = "hev1.1.6.L150.90";
type codec_type = "audio" | "avc" | "hevc" | "av1";
enum codec_id {
  "audio" = 0,
  "avc" = 7,
  "hevc" = 12,
  "av1" = 13,
}

interface dash_unit_video_and_audio_res {
  id: number;
  baseUrl: string;
  // base_url: string;
  backupUrl: string[];
  // backup_url: string[];
  bandwidth: number;
  // mimeType: mime_type;
  // mime_type: "video/mp4";
  codecs: string;
  width: number;
  height: number;
  frameRate: number; //刷新率
  // frame_rate: "23.976";
  sar: string; //Sample aspect ratio 采样纵横比
  // startWithSap: 1;
  // start_with_sap: 1;
  // SegmentBase: {
  //   Initialization: "0-968";
  //   indexRange: "969-4420";
  // };
  // segment_base: {
  //   initialization: "0-968";
  //   index_range: "969-4420";
  // };
  codecid: codec_id;
}

export interface dash_unit_res {
  duration: number; //视频长度(秒s)
  // minBufferTime: number;
  // min_buffer_time: number;
  video: dash_unit_video_and_audio_res[];
  audio: dash_unit_video_and_audio_res[];
  dolby?: { type: 1 | 2; audio: [dash_unit_video_and_audio_res] };
  flac?: { display: boolean; audio: dash_unit_video_and_audio_res };
}

const makeSelect =
  (
    comparator: (
      a: dash_unit_video_and_audio_res,
      b: dash_unit_video_and_audio_res
    ) => boolean
  ) =>
  (a: dash_unit_video_and_audio_res, b: dash_unit_video_and_audio_res) =>
    comparator(a, b) ? a : b;
// const minByValue = makeSelect((a: any, b: any) => a.value <= b.value);
const maxByValue = makeSelect(
  (a: dash_unit_video_and_audio_res, b: dash_unit_video_and_audio_res) =>
    a.id >= b.id
);

function replaceUpos(ori_url: string, ban_pcdn = false, upos?: string) {
  // 参考 https://github.com/guozhigq/pilipala/issues/70
  const ori_url_p = new URL(ori_url);
  if (ban_pcdn) {
    if (ori_url_p.host.match(".mcdn.bilivideo"))
      return (
        "https://proxy-tf-all-ws.bilivideo.com/?url=" +
        encodeURIComponent(ori_url)
      );
    else if (ori_url_p.host.match("szbdyd.com"))
      return ori_url_p.searchParams.get("xy_usource") || ori_url;
    else
      "https://proxy-tf-all-ws.bilivideo.com/?url=" +
        encodeURIComponent(ori_url);
  } else if (upos) {
    if (
      ori_url_p.host.match(
        /(cn|upos)-.*((\.bilivideo\.(com|cn))|(akamaized.net))/g
      ) // 匹配 BCache/大厂upos/akamai
    ) {
      const o = ori_url_p;
      o.host = upos;
      return o.toJSON();
    } else return ori_url;
  } else return ori_url;
  return ori_url;
}

function findUposUrl(urls: string[]) {
  for (const url of urls) {
    const u = new URL(url);
    if (u.host.match(/upos-.*((\.bilivideo\.(com|cn))|(akamaized.net))/g))
      return url;
  }
  return urls[-1];
}

export function parser(
  dash: dash_unit_res,
  qn = 32,
  codec: codec_type[] = ["avc", "hevc", "av1"],
  pcdn: boolean = true,
  upos: string = "",
  print: print_type
) {
  if (!dash.video || !dash.audio) throw new Error("no video stream");
  const codecIds = codec.map((c) => codec_id[c]);
  let video: dash_unit_video_and_audio_res = dash.video[0],
    audio: dash_unit_video_and_audio_res;
  for (const codecId of codecIds) {
    const v = dash.video.find((v) => v.id === qn && v.codecid === codecId);
    if (v) {
      video = v;
      break;
    }
  }
  if (dash.flac && dash.flac?.display) audio = dash.flac.audio;
  else if (dash.dolby && dash.dolby?.audio) audio = dash.dolby.audio[0];
  else audio = dash.audio.reduce(maxByValue);
  // console.debug(dash.audio);
  print.d("视频流：", JSON.stringify(video));
  print.d("音频流：", JSON.stringify(audio));
  return {
    video: {
      //应该使用backupurl
      url: replaceUpos(video.baseUrl, !pcdn, upos),
      qn: qn_list[video.id] || "未知",
      codecs: codec_id[video.codecid] || "未知",
      bandwidth: video.bandwidth,
      fps: video.frameRate,
      width: video.width,
      height: video.height,
    },
    audio: {
      url: replaceUpos(audio.baseUrl, !pcdn, upos),
      qn: qn_list[audio.id] || "未知",
      codecs: audio.codecs,
      bandwidth: audio.bandwidth,
    },
  };
}
