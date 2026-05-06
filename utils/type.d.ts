/**
 * 远程配置类型定义
 * 对应 Cloudflare R2 上的 menu-config.json
 */
export interface ToolLabel {
	zh: string;
	en: string;
	ja?: string;
	ko?: string;
	[lang: string]: string | undefined;
}

export interface ToolConfig {
	slug: string;
	label: ToolLabel;
	/** Lucide 图标名 */
	icon: string;
	enabled: boolean;
	order: number;
}

export interface SiteConfig {
	/** 快捷按钮对应的工具 slug */
	quickTool: string;
	/** 菜单中展示的工具 slug 列表（有序） */
	menuTools: string[];
	/** 图片最小宽度，覆盖全局 imageFilter */
	minWidth?: number;
	/** 图片最小高度，覆盖全局 imageFilter */
	minHeight?: number;
	/** 图片选择器，覆盖默认 img */
	imageSelector?: string;
	/** 需要跳过的容器选择器 */
	skipContainerSelector?: string;
}

export interface ImageFilter {
	minWidth: number;
	minHeight: number;
}

export interface RemoteConfig {
	version: string;
	updatedAt: string;
	/** 黑名单域名，支持 *.example.com 通配符 */
	blacklist: string[];
	/** 全局图片过滤规则 */
	imageFilter: ImageFilter;
	/** 工具列表（完整，包含 disabled 的） */
	tools: ToolConfig[];
	/** 按域名的站点配置，找不到时用 default */
	sites: Record<string, SiteConfig>;
}