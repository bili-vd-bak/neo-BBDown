import { Command } from "@cliffy/command";
import { style } from "@ortense/consolestyle";
import { formatMillisecondsToMinutesAndSeconds } from "./lib/common.ts";
import getConfig from "./lib/config.ts";
import * as bili from "./lib/bili_utils.ts";
import mod_info, { type episodes_res } from "./lib/bgm/info.ts";
import dl from "./lib/bgm/dl.ts";

export interface print_type {
  // deno-lint-ignore no-explicit-any
  p: (t: string, i?: any, ...data: any) => void;
  // deno-lint-ignore no-explicit-any
  d: (t: string, i?: any, ...data: any) => void;
  // deno-lint-ignore no-explicit-any
  suc: (t: string, i?: any, ...data: any) => void;
}

const s = {
  // deno-lint-ignore no-explicit-any
  debug: (...data: any) => style(data).dim().toString(),
  // deno-lint-ignore no-explicit-any
  pri: (...data: any) => style(data).cyan().bold().toString(),
  // deno-lint-ignore no-explicit-any
  sec: (...data: any) => style(data).magenta().italic().toString(),
  // deno-lint-ignore no-explicit-any
  success: (...data: any) => style(data).green().toString(),
  // deno-lint-ignore no-explicit-any
  warn: (...data: any) => style(data).bgYellow().toString(),
};

await new Command()
  // Main command.
  .name("neo-BBDown")
  .version("0.1.0")
  // .description("Command line framework for Deno")
  .globalOption("-d, --debug", "Enable debug output.")
  .globalOption("-c, --config <config_path:file>", "导入配置文件", {
    default: "./config.toml",
  })
  .arguments("<input:string>")
  .globalAction(async (options, args) => {
    // deno-lint-ignore no-explicit-any
    const p = (t: string, i?: any, ...data: any) =>
        console.log(
          s.debug(`[${new Date().toLocaleTimeString()}]`),
          s.pri(t || ""),
          s.sec(i),
          ...data
        ),
      // deno-lint-ignore no-explicit-any
      d = (t: string, i?: any, ...data: any) => {
        if (options.debug)
          console.debug(
            s.warn(`[${new Date().toLocaleTimeString()}]`),
            s.pri(t || ""),
            s.debug(i),
            ...data
          );
      },
      // deno-lint-ignore no-explicit-any
      suc = (t: string, i?: any, ...data: any) =>
        console.log(
          s.debug(`[${new Date().toLocaleTimeString()}]`),
          s.success(t || ""),
          s.sec(i),
          ...data
        );
    const config = getConfig(options.config);
    d("命令选项：", JSON.stringify(options));
    d("命令参数：", args);
    d("配置：", JSON.stringify(config));
    let api_type: "web" | "app" = "app";

    if (typeof args !== "string") throw new Error("invalid args!");
    if (config?.auth?.accesskey || config.auth?.SESSDATA) {
      let user = { uid: 0, vip_type: 0 };
      if (config.auth.accesskey) {
        api_type = "app";
        user = await bili.access_key2info(config?.auth?.accesskey);
      } else if (config.auth.SESSDATA) {
        api_type = "web";
        user = await bili.cookies2info({ SESSDATA: config.auth.SESSDATA });
      }
      if (user.uid === 0) throw new Error("accesskey已过期/无效");
      p(
        "",
        `已通过${api_type}方式登录账号 UID${user.uid} , 您是${
          user.vip_type === 0 ? "普通用户" : "大会员"
        }`
      );
    } else throw new Error("请登录(无效登录)");
    const info = await mod_info(args);
    d("获取番剧信息：", JSON.stringify(info));
    p("番剧标题：", info.title);
    p("番剧简介：", info.evaluate);
    let tmp_mes_ep = style("");
    const tmp_to_dl: episodes_res[] = [];
    info.episodes.forEach((val, i) => {
      const p_location = i + 1,
        pp = (pl: number) => {
          tmp_mes_ep = tmp_mes_ep
            .newLine(
              `  [P${p_location}][${formatMillisecondsToMinutesAndSeconds(
                val.duration
              )}][AV${val.aid}] ${val.long_title}`
            )
            .magenta()
            .italic();
          // tmp_to_dl.push(val);
          tmp_to_dl[pl] = val;
        };
      if (!config?.video?.p?.[2] || config?.video?.p?.[2].length === 0) {
        if (config.video?.p && p_location >= config.video.p[0]) {
          if (config.video.p[1] === 0) pp(p_location);
          else if (p_location <= config.video.p[1]) pp(p_location);
        }
      } else if (config.video.p[2].includes(p_location)) pp(p_location);
    });
    p("分集(已选择的集数)：", "", tmp_mes_ep.toString());
    dl(
      { title: info.title, evaluate: info.evaluate, episodes: tmp_to_dl },
      api_type,
      { p, d, suc },
      config
    );
    // console.table(info.episodes);
    // console.log("番剧标题：",info.title)
    // return info;
  })
  // .action((options, ...args) => {
  //   console.log(args);
  // })
  // Child command 1.
  // .command("dl", "download")
  // .option("-f, --foo", "Foo option.")
  // .arguments("<mdid:string>")
  // .action((options, ...args) => console.log(args))
  // Child command 2.
  // .command("bar", "Bar sub-command.")
  // .option("-b, --bar", "Bar option.")
  // .arguments("<input:string> [output:string]")
  // .action((options, ...args) => console.log("Bar command called."))
  .parse(Deno.args);

// import * as bgm_info from "./lib/bgm/info.ts";
// const a = Number(Deno.args.at(0));
// console.log(a);
// console.log(await bgm_info.md(a));
