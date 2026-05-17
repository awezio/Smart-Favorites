export type Locale = "zh" | "en";

export const translations = {
  zh: {
    nav: {
      features: "功能",
      extension: "浏览器扩展",
      howItWorks: "工作方式",
      github: "GitHub",
      dashboard: "进入控制台",
    },
    hero: {
      title: "Smart Favorites",
      subtitle: "把浏览器收藏夹、GitHub Stars 和文档整理成可搜索、可对话的个人知识库。",
      cta: "开始使用",
      ctaSecondary: "查看源码",
    },
    features: {
      title: "为个人知识库而设计",
      subtitle: "同步、检索、问答和扩展联动集中在一个工作台中。",
      semanticSearch: {
        title: "语义搜索",
        desc: "用自然语言搜索书签、Stars 和文档内容。",
      },
      aiChat: {
        title: "AI 问答",
        desc: "基于你的资料生成答案，并保留引用来源。",
      },
      bookmarks: {
        title: "收藏夹管理",
        desc: "导入、同步、去重并自动补全描述。",
      },
      stars: {
        title: "GitHub Stars",
        desc: "同步开源项目并按语言、主题和相似度检索。",
      },
      extension: {
        title: "浏览器扩展",
        desc: "在浏览器侧栏中搜索、同步和对话。",
      },
      aiDesc: {
        title: "自动描述",
        desc: "为缺少说明的收藏生成摘要，降低整理成本。",
      },
    },
    extensionSection: {
      title: "浏览器扩展与 Web 实时联动",
      subtitle: "通过扩展 Token 连接账号，支持手动、自动和定时同步收藏夹。",
      features: ["侧栏快速搜索", "收藏夹一键同步", "自动变更同步", "连接状态检查"],
      download: "获取扩展",
    },
    howItWorks: {
      title: "三步建立个人知识库",
      steps: [
        { title: "导入资料", desc: "同步收藏夹、Stars 或上传文档。" },
        { title: "生成索引", desc: "自动解析文本并写入向量索引。" },
        { title: "检索问答", desc: "通过搜索、聊天和工具 API 调用知识库。" },
      ],
    },
    footer: {
      desc: "个人知识库与 AI 工具平台",
      builtWith: "Built with Next.js and Supabase",
    },
  },
  en: {
    nav: {
      features: "Features",
      extension: "Extension",
      howItWorks: "How it works",
      github: "GitHub",
      dashboard: "Dashboard",
    },
    hero: {
      title: "Smart Favorites",
      subtitle: "Turn bookmarks, GitHub Stars, and documents into a searchable personal knowledge base.",
      cta: "Get started",
      ctaSecondary: "View source",
    },
    features: {
      title: "Built for personal knowledge",
      subtitle: "Sync, search, chat, and extension workflows in one workspace.",
      semanticSearch: {
        title: "Semantic search",
        desc: "Search bookmarks, Stars, and documents with natural language.",
      },
      aiChat: {
        title: "AI chat",
        desc: "Answer questions from your own sources with citations.",
      },
      bookmarks: {
        title: "Bookmark management",
        desc: "Import, sync, deduplicate, and enrich saved links.",
      },
      stars: {
        title: "GitHub Stars",
        desc: "Sync repositories and search by language, topic, and similarity.",
      },
      extension: {
        title: "Browser extension",
        desc: "Search, sync, and chat from the browser side panel.",
      },
      aiDesc: {
        title: "AI descriptions",
        desc: "Generate summaries for links that lack useful descriptions.",
      },
    },
    extensionSection: {
      title: "Browser extension connected to the web app",
      subtitle: "Connect with an extension token and sync manually, automatically, or on a schedule.",
      features: ["Side-panel search", "One-click bookmark sync", "Automatic change sync", "Connection checks"],
      download: "Get extension",
    },
    howItWorks: {
      title: "Build your knowledge base in three steps",
      steps: [
        { title: "Import", desc: "Sync bookmarks, Stars, or upload documents." },
        { title: "Index", desc: "Parse content and write semantic vectors." },
        { title: "Use", desc: "Search, chat, and call tools from external AI apps." },
      ],
    },
    footer: {
      desc: "Personal knowledge base and AI tools platform",
      builtWith: "Built with Next.js and Supabase",
    },
  },
} as const;
