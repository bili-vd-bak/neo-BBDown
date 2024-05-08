import $ from "@david/dax";
import { UA } from "./common.ts";
import { config_type } from "./config.ts";
import { print_type } from "../cli.ts";

export default async function main(
  link: string,
  cwd: string,
  tmp_file_name: string,
  platform: "pc" | "app",
  config: config_type,
  print: print_type
) {
  const basic_args =
    "--auto-file-renaming=false --download-result=hide --allow-overwrite=true --console-log-level=warn -x16 -s16 -j16 -k5M";
  let auth_args = `--header="User-Agent: ${
    platform === "app"
      ? "Mozilla/5.0 BiliDroid/7.49.0 (bbcallen@gmail.com)"
      : UA
  }"`;
  if (platform === "pc")
    auth_args += ` --header="Referer: https://www.bilibili.com"`;

  $.path(cwd).mkdirSync();
  const command = `${
    config?.other?.aria2c || "./aria2c"
  } ${basic_args} "${link}" -o ${$.path(cwd + "/" + tmp_file_name).resolve()}`;
  // print.p("或手动运行命令：", command);
  // await $`${command}`.cwd(cwd).stdout(Deno.stdout);
  const r = $.request(link).header(
    "User-Agent",
    platform === "app"
      ? "Mozilla/5.0 BiliDroid/7.49.0 (bbcallen@gmail.com)"
      : UA
  );
  if (platform === "pc") r.header("Referer", "https://www.bilibili.com");
  if ($.path(cwd + "/" + tmp_file_name).existsSync())
    print.suc("文件存在，跳过下载。");
  else {
    if (config?.dl?.bat_mode) {
      const pa = $.path(`./runToDL.sh`);
      if (!pa.existsSync()) pa.writeTextSync("#!/bin/bash");
      pa.writeTextSync(
        "\r\n" + config?.dl?.bat_mode === "aria2c"
          ? command
          : `${config?.dl?.bat_mode} ${link}`
      );
    } else {
      await r.showProgress().pipeToPath(cwd + "/" + tmp_file_name);
      print.suc("或手动运行命令：", command);
    }
  }
}
