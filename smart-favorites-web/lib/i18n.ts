export type Locale = "zh" | "en";

interface FeatureItem {
  title: string;
  desc: string;
}

interface HowItWorksStep {
  title: string;
  desc: string;
}

interface Translations {
  nav: {
    features: string;
    extension: string;
    howItWorks: string;
    github: string;
    dashboard: string;
  };
  hero: {
    title: string;
    subtitle: string;
    cta: string;
    ctaSecondary: string;
  };
  features: {
    title: string;
    subtitle: string;
    semanticSearch: FeatureItem;
    aiChat: FeatureItem;
    bookmarks: FeatureItem;
    stars: FeatureItem;
    extension: FeatureItem;
    aiDesc: FeatureItem;
  };
  extensionSection: {
    title: string;
    subtitle: string;
    features: string[];
    download: string;
  };
  howItWorks: {
    title: string;
    steps: HowItWorksStep[];
  };
  footer: {
    desc: string;
    builtWith: string;
  };
}

export const translations: Record<Locale, Translations> = {
  zh: {
    nav: {
      features: "功能特性",
      extension: "浏览器插件",
      howItWorks: "工作原理",
      github: "GitHub",
      dashboard: "进入应用",
    },
    hero: {
      title: "智能管理你的\n书签和 GitHub Stars",
      subtitle:
        "使用 AI 驱动的语义搜索，在所有收藏中精准找到你需要的内容。支持自然语言提问，像聊天一样检索知识。",
      cta: "立即使用",
      ctaSecondary: "查看源码",
    },
    features: {
      title: "为什么选择 Smart Favorites？",
      subtitle: "将你分散在各处的知识和资源统一管理，用 AI 让检索变得简单。",
      semanticSearch: {
        title: "语义搜索",
        desc: "不需要记住准确的词语，用自然语言描述你的需求，AI 会理解并找到相关内容。",
      },
      aiChat: {
        title: "AI 问答",
        desc: "直接对你的收藏库提问，AI 结合你保存的内容给出有依据的回答，并标注来源。",
      },
      bookmarks: {
        title: "书签管理",
        desc: "导入浏览器书签，自动生成描述和 AI 摘要，支持死链检测与内容抓取。",
      },
      stars: {
        title: "GitHub Stars",
        desc: "同步你 Star 过的所有仓库，按语言、描述语义搜索，不再让好项目沉入历史。",
      },
      extension: {
        title: "浏览器插件",
        desc: "一键保存当前页面到收藏夹，支持 AI 自动生成标题和描述，无需手动填写。",
      },
      aiDesc: {
        title: "AI 自动描述",
        desc: "为没有描述的书签自动生成摘要，让检索更准确，让收藏更有价值。",
      },
    },
    extensionSection: {
      title: "浏览器插件，随时随地保存",
      subtitle:
        "安装插件后，只需点击一下即可将当前页面保存到你的智能收藏夹。AI 自动生成标题和描述，帮你省去繁琐操作。",
      features: [
        "一键保存当前页面",
        "AI 自动生成标题和描述",
        "侧边栏快速搜索收藏",
        "支持 Chrome / Edge / Firefox",
      ],
      download: "获取浏览器插件",
    },
    howItWorks: {
      title: "三步开始使用",
      steps: [
        {
          title: "导入你的收藏",
          desc: "从浏览器导入书签，或连接 GitHub 账户同步 Stars，也可以通过插件逐一保存。",
        },
        {
          title: "AI 自动处理",
          desc: "系统自动为每条内容生成 AI 摘要和向量索引，无需任何手动操作。",
        },
        {
          title: "智能检索",
          desc: "使用自然语言搜索，或直接提问让 AI 从你的收藏中找到答案。",
        },
      ],
    },
    footer: {
      desc: "基于 AI 的智能收藏夹",
      builtWith: "使用 ❤️ 构建",
    },
  },
  en: {
    nav: {
      features: "Features",
      extension: "Extension",
      howItWorks: "How It Works",
      github: "GitHub",
      dashboard: "Dashboard",
    },
    hero: {
      title: "Smart Management for Your\nBookmarks & GitHub Stars",
      subtitle:
        "AI-powered semantic search across all your saved content. Ask questions in natural language and get answers grounded in your own knowledge base.",
      cta: "Get Started",
      ctaSecondary: "View on GitHub",
    },
    features: {
      title: "Why Smart Favorites?",
      subtitle:
        "Unify your scattered knowledge and resources in one place. Let AI make retrieval effortless.",
      semanticSearch: {
        title: "Semantic Search",
        desc: "No need to remember exact keywords. Describe what you need in plain language and AI will find the relevant content.",
      },
      aiChat: {
        title: "AI Chat",
        desc: "Ask questions directly against your collection. AI answers with evidence from your saved content and cites its sources.",
      },
      bookmarks: {
        title: "Bookmark Management",
        desc: "Import browser bookmarks, auto-generate descriptions, detect dead links, and fetch full page content.",
      },
      stars: {
        title: "GitHub Stars",
        desc: "Sync all your starred repos. Search by language or semantic description so great projects never get lost.",
      },
      extension: {
        title: "Browser Extension",
        desc: "Save any page to your favorites with one click. AI auto-generates title and description for you.",
      },
      aiDesc: {
        title: "AI Auto-Description",
        desc: "Automatically generate summaries for bookmarks without descriptions, improving search accuracy.",
      },
    },
    extensionSection: {
      title: "Browser Extension — Save Anywhere",
      subtitle:
        "Install the extension and save any page to your smart favorites with a single click. AI fills in the title and description automatically.",
      features: [
        "Save current page with one click",
        "AI auto-generates title and description",
        "Quick search in the side panel",
        "Supports Chrome / Edge / Firefox",
      ],
      download: "Get the Extension",
    },
    howItWorks: {
      title: "Three Steps to Get Started",
      steps: [
        {
          title: "Import Your Collection",
          desc: "Import bookmarks from your browser, sync GitHub Stars, or save pages one by one with the extension.",
        },
        {
          title: "AI Processes Everything",
          desc: "The system automatically generates AI summaries and vector indexes for every item — no manual work needed.",
        },
        {
          title: "Search Intelligently",
          desc: "Search in natural language or ask questions and let AI find answers from your own collection.",
        },
      ],
    },
    footer: {
      desc: "AI-powered smart favorites",
      builtWith: "Built with ❤️",
    },
  },
};
