import $ from "@david/dax";
/*
// @deno-types="@types/fluent-ffmpeg"
import ffmpeg from "fluent-ffmpeg";
*/
import { config_type } from "./config.ts";
import { episodes_res } from "./bgm/info.ts";
import { getValidFileName } from "./common.ts";
import { st_res } from "./bgm/dl.ts";
import { print_type } from "../cli.ts";

export default async function main(
  output: string,
  info: { title: string; evaluate: string; episode: episodes_res },
  cwd: string,
  config: config_type,
  print: print_type,
  subtitle_lans?: st_res[]
) {
  let input_args = "",
    map_args = "",
    // subtitle_args = "",
    metadata_args = `-metadata title="${getValidFileName(
      info.episode.share_copy
    )}" -metadata description="${getValidFileName(
      info.evaluate
    )}" -metadata album="${getValidFileName(
      info.title
    )}" -metadata creation_time="${new Date(
      info.episode.pub_time * 1000
    ).toISOString()}" `;

  ["video.m4s", "audio.m4s", "cover.png"].forEach(
    (i) => (input_args += `-i "${cwd}/${i}" `)
  );
  if (subtitle_lans && subtitle_lans.length > 0)
    subtitle_lans.forEach((s, i) => {
      metadata_args += `-metadata:s:s:${i} title="${s.lan_doc}" -metadata:s:s:${i} language="${s.lan}" `;
      input_args += `-i "${cwd}/subtitle.${s.lan}.srt" `;
      // subtitle_args += ``;
    });
  for (let i = 0; i < 3 + (subtitle_lans?.length || 0); i++)
    map_args += `-map ${i} `;

  metadata_args += "-disposition:v:1 attached_pic";

  const basic_args = `-c copy -vn ${
      subtitle_lans && subtitle_lans.length > 0 ? "-c:s mov_text" : ""
    }`,
    opt_args = "-movflags faststart -strict unofficial -strict -2 -f mp4 --";

  const command = `${
    config?.other?.ffmpeg || "./ffmpeg"
  } ${input_args} ${metadata_args} ${map_args} ${basic_args} ${opt_args} "${output}"`;
  print.p("或手动运行命令：", command);
  const pa = $.path(`./runToFFMPEG.sh`);
  if (!pa.existsSync()) pa.writeTextSync("#!/bin/bash");
  pa.writeTextSync("\r\n" + command);
  if ($.commandExistsSync(config?.other?.ffmpeg || "")) {
    await $`${command}`.cwd(cwd).stdout(Deno.stdout);
    $.path(cwd).removeSync();
  }
}
