import { parse } from "@std/toml";
// import { Cache } from "@lambdalisue/ttl-cache";

type codecs = "hevc" | "av1" | "avc";

export interface config_type {
  auth?: { SESSDATA?: string; cookies?: string; accesskey?: string };
  dl?: {
    danmaku?: boolean;
    subtitle?: boolean;
    pcdn?: boolean;
    upos?: string;
  };
  video?: { codecs?: codecs[]; qn?: number; p?: [number, number, number[]?] };
  save?: { single?: string; dir?: string };
  other?: { aria2c?: string; ffmpeg?: string };
  // rt: { cache: Cache<string, object> };
}

export default function main(path = "./neo-bbdown.toml") {
  const decoder = new TextDecoder("utf-8");
  const j = parse(
    decoder.decode(Deno.readFileSync(path))
  ) as unknown as config_type;
  // j.rt.cache = new Cache<string, object>(2 * 60 * 60 * 1000);
  return j;
}

Deno.test({
  name: "config",
  fn() {
    console.log(main());
  },
});
