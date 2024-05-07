# neo-BBDown

BBDown的Deno实现(半成品,目前仅实现番剧下载,供参考)

## 使用

克隆仓库至本地使用。  
使用`-c`指定配置文件，示例及帮助在`config.example.toml`，可复制一份并重命名使用。  

```bash
# https://raw.githubusercontent.com/bili-vd-bak/neo-BBDown/master/cli.ts
deno run --allow-all ./cli.ts -c ./config.toml 'B站番剧链接或ID(md/ep/ss)'
# e.g.
deno run --allow-all ./cli.ts -c ./config.toml 'https://www.bilibili.com/bangumi/media/md21231359?spm_id_from=..0.0'
```

## TODO

- 打包Release(bin)以直接使用
- 替换PCDN/MCDN
- 处理无音频(audio)的视频
- 支持普通视频/收藏夹下载
- ffmpeg部分自动执行

## LICENSE

MIT
