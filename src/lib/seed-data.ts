import type { Bookmark, Character, MediaItem, Note } from './types'

export interface SeedMedia
  extends Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt' | 'characters' | 'cast'> {
  characters: Character[]
  cast: MediaItem['cast']
}

const day = 86_400_000
const now = Date.now()

export const SEED_MEDIA: SeedMedia[] = [
  {
    type: 'anime',
    title: '葬送的芙莉莲',
    originalTitle: '葬送のフリーレン',
    cover: './covers/frieren.jpg',
    year: 2023,
    country: 'JP',
    status: 'doing',
    rating: 9.2,
    favorite: true,
    progressCurrent: 18,
    progressTotal: 28,
    progressUnit: 'ep',
    tags: ['奇幻', '公路', '治愈'],
    genres: ['奇幻', '冒险', '剧情'],
    studios: ['MADHOUSE'],
    characters: [
      { name: '芙莉莲', role: 'main', cv: '种崎敦美' },
      { name: '菲伦', role: 'main', cv: '市之濑加那' },
      { name: '休塔尔克', role: 'main', cv: '小林千晃' },
      { name: '辛美尔', role: 'supporting', cv: '冈本信彦' },
      { name: '海塔', role: 'supporting', cv: '大塚芳忠' },
    ],
    cast: [{ name: '种崎敦美', role: '芙莉莲' }, { name: '市之濑加那', role: '菲伦' }],
    synopsis:
      '勇者一行打败魔王之后，精灵魔法使芙莉莲踏上了一段迟来的旅程。她开始重新认识人类，也重新认识那些被她忽略的短暂岁月。',
    notes: '第 18 集看完，停在考试篇之前。',
  },
  {
    type: 'anime',
    title: '进击的巨人',
    originalTitle: '進撃の巨人',
    cover: './covers/aot.jpg',
    year: 2013,
    country: 'JP',
    status: 'done',
    rating: 9.5,
    favorite: true,
    progressCurrent: 87,
    progressTotal: 87,
    progressUnit: 'ep',
    tags: ['热血', '奇幻', '战争'],
    genres: ['动作', '剧情', '奇幻'],
    studios: ['WIT STUDIO', 'MAPPA'],
    characters: [
      { name: '艾伦·耶格尔', role: 'main', cv: '梶裕贵' },
      { name: '三笠·阿克曼', role: 'main', cv: '石川由依' },
      { name: '阿尔敏·阿诺德', role: 'main', cv: '井上麻里奈' },
      { name: '利威尔', role: 'supporting', cv: '神谷浩史' },
    ],
    cast: [{ name: '梶裕贵', role: '艾伦' }, { name: '石川由依', role: '三笠' }],
    synopsis:
      '高墙之内的人类以为世界只有这么大，直到超大型巨人踏破了城门。自由、代价与选择，被一层层推到少年们面前。',
  },
  {
    type: 'movie',
    title: '星际穿越',
    originalTitle: 'Interstellar',
    cover: './covers/interstellar.jpg',
    year: 2014,
    country: 'US',
    status: 'done',
    rating: 9.4,
    favorite: true,
    progressCurrent: 1,
    progressTotal: 1,
    progressUnit: 'page',
    tags: ['科幻', '太空', '亲情'],
    genres: ['科幻', '冒险', '剧情'],
    studios: ['Legendary Pictures', 'Syncopy'],
    characters: [
      { name: '库珀', role: 'main', cv: '马修·麦康纳' },
      { name: '布兰德', role: 'main', cv: '安妮·海瑟薇' },
      { name: '墨菲', role: 'main', cv: '杰西卡·查斯坦' },
    ],
    cast: [{ name: '马修·麦康纳', role: '库珀' }, { name: '安妮·海瑟薇', role: '布兰德' }],
    synopsis:
      '地球正在死去。一位父亲穿过虫洞去寻找新的家园，却发现自己真正要对抗的，是时间本身。',
    notes: '重看。最动人的不是五维空间，是那二十三年的留言。',
  },
  {
    type: 'movie',
    title: '沙丘',
    originalTitle: 'Dune',
    cover: './covers/dune.jpg',
    year: 2021,
    country: 'US',
    status: 'wish',
    progressCurrent: 0,
    progressTotal: 1,
    progressUnit: 'page',
    tags: ['科幻', '史诗'],
    genres: ['科幻', '冒险'],
    studios: ['Legendary Pictures'],
    characters: [
      { name: '保罗·厄崔迪', role: 'main', cv: '提莫西·查拉梅' },
      { name: '契妮', role: 'main', cv: '赞达亚' },
      { name: '杰西卡夫人', role: 'main', cv: '丽贝卡·弗格森' },
    ],
    cast: [{ name: '提莫西·查拉梅', role: '保罗' }, { name: '赞达亚', role: '契妮' }],
    synopsis: '沙漠星球厄拉科斯上，香料、预言与家族命运交织，一个少年被推向救世主与毁灭者之间的位置。',
  },
  {
    type: 'novel',
    title: '三体',
    originalTitle: 'The Three-Body Problem',
    cover: './covers/threebody.jpg',
    year: 2006,
    country: 'CN',
    status: 'done',
    rating: 9.0,
    progressCurrent: 3,
    progressTotal: 3,
    progressUnit: 'volume',
    tags: ['科幻', '硬科幻', '中国'],
    genres: ['科幻'],
    studios: ['重庆出版社'],
    characters: [
      { name: '叶文洁', role: 'main' },
      { name: '汪淼', role: 'main' },
      { name: '罗辑', role: 'supporting' },
    ],
    cast: [],
    synopsis:
      '一次朝向宇宙的呼叫，换来了一个文明的回应。人类第一次意识到，黑暗本身可能就是一种秩序。',
  },
  {
    type: 'manga',
    title: '链锯人',
    originalTitle: 'チェンソーマン',
    cover: './covers/chainsaw.jpg',
    year: 2018,
    country: 'JP',
    status: 'doing',
    rating: 8.8,
    progressCurrent: 60,
    progressTotal: 97,
    progressUnit: 'chapter',
    tags: ['热血', '黑暗', '恶魔'],
    genres: ['动作', '黑暗奇幻'],
    studios: ['集英社'],
    characters: [
      { name: '电次', role: 'main', cv: '户谷菊之介' },
      { name: '玛奇玛', role: 'main', cv: '楠木灯' },
      { name: '帕瓦', role: 'main', cv: '井泽诗织' },
      { name: '早川秋', role: 'supporting', cv: '坂田将吾' },
    ],
    cast: [],
    synopsis: '一个背着债务的少年与电锯恶魔合体，成了公安对魔特异课最不按常理出牌的成员。',
    notes: '停在 60 话，准备找个周末一口气补完。',
  },
  {
    type: 'novel',
    title: '挪威的森林',
    originalTitle: 'ノルウェイの森',
    cover: './covers/norwegian.jpg',
    year: 1987,
    country: 'JP',
    status: 'onhold',
    rating: 8.0,
    progressCurrent: 4,
    progressTotal: 11,
    progressUnit: 'chapter',
    tags: ['文学', '青春', '爱情'],
    genres: ['文学', '爱情'],
    studios: ['上海译文出版社'],
    characters: [
      { name: '渡边', role: 'main' },
      { name: '直子', role: 'main' },
      { name: '绿子', role: 'main' },
    ],
    cast: [],
    synopsis: '一段关于青春、失去与自我和解的旅程。有人在雨里走散，有人在电话亭里等一个不会来的声音。',
    notes: '读到第四章，缓一缓。',
  },
  {
    type: 'manga',
    title: '迷宫饭',
    originalTitle: 'ダンジョン飯',
    cover: './covers/dungeon.jpg',
    year: 2014,
    country: 'JP',
    status: 'wish',
    progressCurrent: 0,
    progressTotal: 14,
    progressUnit: 'volume',
    tags: ['奇幻', '美食', '冒险'],
    genres: ['奇幻', '喜剧', '美食'],
    studios: ['KADOKAWA'],
    characters: [
      { name: '莱欧斯', role: 'main' },
      { name: '玛露希尔', role: 'main' },
      { name: '奇尔查克', role: 'main' },
      { name: '先西', role: 'main' },
    ],
    cast: [],
    synopsis: '为了救回被龙吞掉的妹妹，一支穷得叮当响的冒险小队决定——把迷宫里的魔物煮来吃。',
  },
  {
    type: 'tv',
    title: '重启人生',
    originalTitle: 'ブラッシュアップライフ',
    cover: './covers/rebirth.jpg',
    year: 2023,
    country: 'JP',
    status: 'done',
    rating: 9.4,
    favorite: true,
    progressCurrent: 10,
    progressTotal: 10,
    progressUnit: 'ep',
    tags: ['日剧', '生活', '奇幻'],
    genres: ['剧情', '喜剧', '奇幻'],
    studios: ['日本电视台'],
    characters: [
      { name: '近藤麻美', role: 'main', cv: '安藤樱' },
      { name: '门田美步', role: 'main', cv: '夏帆' },
      { name: '福本共美', role: 'main', cv: '木南晴夏' },
      { name: '河口美奈子', role: 'supporting', cv: '水川麻美' },
    ],
    cast: [{ name: '安藤樱', role: '近藤麻美' }, { name: '夏帆', role: '门田美步' }],
    synopsis: '普通女子在一次意外后获得重开人生的机会，她决定一次次重来，只为了把身边的人都好好留住。',
    notes: '看到最后一集，哭得比想象中厉害。',
  },
  {
    type: 'tv',
    title: '漫长的季节',
    originalTitle: 'The Long Season',
    cover: './covers/longseason.jpg',
    year: 2023,
    country: 'CN',
    status: 'doing',
    rating: 9.5,
    favorite: true,
    progressCurrent: 6,
    progressTotal: 12,
    progressUnit: 'ep',
    tags: ['国产剧', '悬疑', '年代'],
    genres: ['悬疑', '剧情', '犯罪'],
    studios: ['腾讯视频'],
    characters: [
      { name: '王响', role: 'main', cv: '范伟' },
      { name: '龚彪', role: 'main', cv: '秦昊' },
      { name: '马德胜', role: 'main', cv: '陈明昊' },
      { name: '沈墨', role: 'supporting', cv: '李庚希' },
    ],
    cast: [{ name: '范伟', role: '王响' }, { name: '秦昊', role: '龚彪' }],
    synopsis: '东北小城，一列火车、一桩旧案、几个被时间困住的人。二十年过去，秋天还是没有过去。',
    notes: '看到第 6 集，节奏慢慢起来了。',
  },
]

export const SEED_BOOKMARKS: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    url: 'https://github.com',
    title: 'GitHub',
    description: '代码、开源项目与 Actions 自动化。',
    tags: ['开发', '工具'],
  },
  {
    url: 'https://bgm.tv',
    title: 'Bangumi 番组计划',
    description: '番剧、漫画、轻小说的条目数据库，元数据来源。',
    tags: ['番剧', '数据库'],
  },
  {
    url: 'https://movie.douban.com',
    title: '豆瓣电影',
    description: '找片、看评分、写短评。',
    tags: ['影视', '评分'],
  },
  {
    url: 'https://www.bilibili.com',
    title: '哔哩哔哩',
    description: '看番、看纪录片、看别人打游戏。',
    tags: ['番剧', '视频'],
  },
  {
    url: 'https://www.zhihu.com',
    title: '知乎',
    description: '偶尔认真读长回答的地方。',
    tags: ['阅读', '社区'],
  },
  {
    url: 'https://sspai.com',
    title: '少数派',
    description: '效率工具与数字生活方式。',
    tags: ['效率', '阅读'],
  },
  {
    url: 'https://developer.mozilla.org',
    title: 'MDN Web Docs',
    description: '前端开发最可靠的手册。',
    tags: ['开发', '文档'],
  },
  {
    url: 'https://www.gcores.com',
    title: '机核 GCORES',
    description: '游戏、文化与声音节目。',
    tags: ['游戏', '播客'],
  },
]

export function seedTimestamps(index: number) {
  return {
    createdAt: now - (SEED_MEDIA.length - index) * day * 3,
    updatedAt: now - index * 3600_000,
  }
}

export const SEED_NOTES: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '欢迎来到 Meme 备忘录',
    pinned: true,
    tags: ['使用说明'],
    content: `## 这是左侧最前面的新页面

随手记下想看的、想做的、想留住的。

- [x] 支持 Markdown
- [x] 自动保存
- [ ] 点右上角的图钉，把它置顶
- [ ] 试试搜索「周末」

> 备忘录会和媒体库一起同步到 GitHub 私有仓库。
`,
  },
  {
    title: '这个周末',
    tags: ['生活', '待办'],
    content: `- [ ] 把《漫长的季节》最后几集看完
- [ ] 整理「想看」列表
- [ ] 去书店，别空手回来

顺便找找有没有新的日剧。
`,
  },
  {
    title: '摘录',
    tags: ['摘录'],
    content: `> 孤独不是没有人陪你，是你不知道该把哪一部分的自己交给谁。

——《夜航书店》
`,
  },
]
