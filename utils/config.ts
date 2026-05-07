/**
 * 内置兜底配置
 * 在无网络 / R2 故障 / 首次安装还没拉到配置时使用
 */
export const DEFAULT_CONFIG: RemoteConfig = {
	"version": "2.0.0",
	"updatedAt": "2026-05-08",

	"blacklist": [
		"mail.google.com",
		"docs.google.com",
		"sheets.google.com",
		"slides.google.com",
		"drive.google.com",
		"calendar.google.com",
		"notion.so",
		"github.com",
		"gitlab.com",
		"linear.app",
		"figma.com",
		"canva.com",
		"bulkpictools.com"
	],

	"imageFilter": {
		"minWidth": 200,
		"minHeight": 200
	},

	"tools": [
		{
			"slug": "image-compressor",
			"label": { "zh": "批量压缩", "en": "Bulk Compress", "ja": "一括圧縮", "ko": "일괄 압축" },
			"icon": "file-zip",
			"enabled": true,
			"order": 1
		},
		{
			"slug": "image-resizer",
			"label": { "zh": "尺寸调整", "en": "Bulk Resize", "ja": "リサイズ", "ko": "크기 조정" },
			"icon": "scaling",
			"enabled": true,
			"order": 2
		},
		{
			"slug": "image-cropper",
			"label": { "zh": "裁剪图片", "en": "Bulk Crop", "ja": "トリミング", "ko": "자르기" },
			"icon": "crop",
			"enabled": true,
			"order": 3
		},
		{
			"slug": "image-watermark",
			"label": { "zh": "添加水印", "en": "Watermark", "ja": "透かし追加", "ko": "워터마크" },
			"icon": "stamp",
			"enabled": true,
			"order": 4
		},
		{
			"slug": "remove-background",
			"label": { "zh": "去除背景", "en": "Remove BG", "ja": "背景削除", "ko": "배경 제거" },
			"icon": "eraser",
			"enabled": true,
			"order": 5
		},
		{
			"slug": "image-converter",
			"label": { "zh": "格式转换", "en": "Convert", "ja": "変換", "ko": "변환" },
			"icon": "refresh-cw",
			"enabled": true,
			"order": 6
		},
		{
			"slug": "image-rotator",
			"label": { "zh": "旋转图片", "en": "Rotate", "ja": "回転", "ko": "회전" },
			"icon": "rotate-cw",
			"enabled": true,
			"order": 7
		},
		{
			"slug": "image-flipper",
			"label": { "zh": "翻转图片", "en": "Flip", "ja": "反転", "ko": "뒤집기" },
			"icon": "flip-horizontal",
			"enabled": true,
			"order": 8
		},
		{
			"slug": "to-webp",
			"label": { "zh": "转为 WebP", "en": "To WebP", "ja": "WebPに変換", "ko": "WebP 변환" },
			"icon": "image",
			"enabled": true,
			"order": 9
		},
		{
			"slug": "to-jpg",
			"label": { "zh": "转为 JPG", "en": "To JPG", "ja": "JPGに変換", "ko": "JPG 변환" },
			"icon": "image",
			"enabled": true,
			"order": 10
		},
		{
			"slug": "to-png",
			"label": { "zh": "转为 PNG", "en": "To PNG", "ja": "PNGに変換", "ko": "PNG 변환" },
			"icon": "image",
			"enabled": true,
			"order": 11
		},
		{
			"slug": "heic-to-jpg",
			"label": { "zh": "HEIC转JPG", "en": "HEIC to JPG", "ja": "HEIC→JPG", "ko": "HEIC→JPG" },
			"icon": "image",
			"enabled": true,
			"order": 12
		},
		{
			"slug": "png-to-jpg",
			"label": { "zh": "PNG转JPG", "en": "PNG to JPG", "ja": "PNG→JPG", "ko": "PNG→JPG" },
			"icon": "image",
			"enabled": true,
			"order": 13
		},
		{
			"slug": "webp-to-jpg",
			"label": { "zh": "WebP转JPG", "en": "WebP to JPG", "ja": "WebP→JPG", "ko": "WebP→JPG" },
			"icon": "image",
			"enabled": true,
			"order": 14
		},
		{
			"slug": "svg-to-png",
			"label": { "zh": "SVG转PNG", "en": "SVG to PNG", "ja": "SVG→PNG", "ko": "SVG→PNG" },
			"icon": "image",
			"enabled": true,
			"order": 15
		},
		{
			"slug": "compress-to-100kb",
			"label": { "zh": "压缩至100KB", "en": "Compress to 100KB", "ja": "100KBに圧縮", "ko": "100KB로 압축" },
			"icon": "file-zip",
			"enabled": true,
			"order": 16
		},
		{
			"slug": "compress-to-200kb",
			"label": { "zh": "压缩至200KB", "en": "Compress to 200KB", "ja": "200KBに圧縮", "ko": "200KB로 압축" },
			"icon": "file-zip",
			"enabled": true,
			"order": 17
		},
		{
			"slug": "compress-to-500kb",
			"label": { "zh": "压缩至500KB", "en": "Compress to 500KB", "ja": "500KBに圧縮", "ko": "500KB로 압축" },
			"icon": "file-zip",
			"enabled": true,
			"order": 18
		},
		{
			"slug": "compress-to-1mb",
			"label": { "zh": "压缩至1MB", "en": "Compress to 1MB", "ja": "1MBに圧縮", "ko": "1MB로 압축" },
			"icon": "file-zip",
			"enabled": true,
			"order": 19
		},
		{
			"slug": "compress-to-2mb",
			"label": { "zh": "压缩至2MB", "en": "Compress to 2MB", "ja": "2MBに圧縮", "ko": "2MB로 압축" },
			"icon": "file-zip",
			"enabled": true,
			"order": 20
		},
		{
			"slug": "compress-to-50kb",
			"label": { "zh": "压缩至50KB", "en": "Compress to 50KB", "ja": "50KBに圧縮", "ko": "50KB로 압축" },
			"icon": "file-zip",
			"enabled": true,
			"order": 21
		},
		{
			"slug": "youtube-thumbnail-resizer",
			"label": { "zh": "YT封面", "en": "YT Thumbnail", "ja": "YTサムネイル", "ko": "YT 썸네일" },
			"icon": "youtube",
			"enabled": true,
			"order": 22
		},
		{
			"slug": "instagram-resizer",
			"label": { "zh": "Instagram尺寸", "en": "Instagram Size", "ja": "Instagramサイズ", "ko": "인스타그램 크기" },
			"icon": "instagram",
			"enabled": true,
			"order": 23
		},
		{
			"slug": "facebook-image-resizer",
			"label": { "zh": "Facebook尺寸", "en": "Facebook Size", "ja": "Facebookサイズ", "ko": "페이스북 크기" },
			"icon": "facebook",
			"enabled": true,
			"order": 24
		},
		{
			"slug": "blur-faces",
			"label": { "zh": "模糊人脸", "en": "Blur Faces", "ja": "顔ぼかし", "ko": "얼굴 흐리기" },
			"icon": "eye-off",
			"enabled": true,
			"order": 25
		},
		{
			"slug": "round-corners",
			"label": { "zh": "圆角图片", "en": "Round Corners", "ja": "角丸", "ko": "모서리 둥글게" },
			"icon": "square",
			"enabled": true,
			"order": 26
		},
		{
			"slug": "merge-images",
			"label": { "zh": "合并图片", "en": "Merge Images", "ja": "画像合成", "ko": "이미지 합치기" },
			"icon": "layers",
			"enabled": true,
			"order": 27
		},
		{
			"slug": "gif-compressor",
			"label": { "zh": "GIF压缩", "en": "GIF Compress", "ja": "GIF圧縮", "ko": "GIF 압축" },
			"icon": "file-zip",
			"enabled": true,
			"order": 28
		},
		{
			"slug": "gif-maker",
			"label": { "zh": "GIF制作", "en": "GIF Maker", "ja": "GIF作成", "ko": "GIF 만들기" },
			"icon": "film",
			"enabled": true,
			"order": 29
		},
		{
			"slug": "gif-resizer",
			"label": { "zh": "GIF调整尺寸", "en": "GIF Resize", "ja": "GIFリサイズ", "ko": "GIF 크기 조정" },
			"icon": "scaling",
			"enabled": true,
			"order": 30
		},
		{
			"slug": "images-to-gif",
			"label": { "zh": "图片转GIF", "en": "Images to GIF", "ja": "画像→GIF", "ko": "이미지→GIF" },
			"icon": "film",
			"enabled": true,
			"order": 31
		},
		{
			"slug": "video-to-gif",
			"label": { "zh": "视频转GIF", "en": "Video to GIF", "ja": "動画→GIF", "ko": "영상→GIF" },
			"icon": "video",
			"enabled": true,
			"order": 32
		},
		{
			"slug": "exif-editor",
			"label": { "zh": "EXIF编辑", "en": "EXIF Editor", "ja": "EXIF編集", "ko": "EXIF 편집" },
			"icon": "file-edit",
			"enabled": true,
			"order": 33
		},
		{
			"slug": "exif-viewer",
			"label": { "zh": "EXIF查看", "en": "EXIF Viewer", "ja": "EXIF表示", "ko": "EXIF 보기" },
			"icon": "file-search",
			"enabled": true,
			"order": 34
		},
		{
			"slug": "change-image-brightness",
			"label": { "zh": "亮度调整", "en": "Brightness", "ja": "明るさ調整", "ko": "밝기 조정" },
			"icon": "sun",
			"enabled": true,
			"order": 35
		},
		{
			"slug": "grayscale-image",
			"label": { "zh": "灰度图片", "en": "Grayscale", "ja": "グレースケール", "ko": "흑백" },
			"icon": "circle-half-stroke",
			"enabled": true,
			"order": 36
		},
		{
			"slug": "invert-image-colors",
			"label": { "zh": "反转颜色", "en": "Invert Colors", "ja": "色反転", "ko": "색상 반전" },
			"icon": "contrast",
			"enabled": true,
			"order": 37
		},
		{
			"slug": "circle-image-cropper",
			"label": { "zh": "圆形裁剪", "en": "Circle Crop", "ja": "円形切り抜き", "ko": "원형 자르기" },
			"icon": "circle",
			"enabled": true,
			"order": 38
		},
		{
			"slug": "passport-photo-cropper",
			"label": { "zh": "证件照裁剪", "en": "Passport Crop", "ja": "証明写真", "ko": "여권 사진" },
			"icon": "user-square",
			"enabled": true,
			"order": 39
		},
		{
			"slug": "2x2-photo-cropper",
			"label": { "zh": "2x2英寸裁剪", "en": "2x2 Photo", "ja": "2x2写真", "ko": "2x2 사진" },
			"icon": "user-square",
			"enabled": true,
			"order": 40
		}
	],

	"sites": {

		"default": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-cropper", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"doubao.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background", "to-webp"],
			"minWidth": 200,
			"minHeight": 200,
			"imageSelector": "img[src*='byteimg.com']",
			"skipContainerSelector": "header, nav, [data-testid='file_drop_area']"
		},

		"midjourney.com": {
			"quickTool": "image-resizer",
			"menuTools": ["image-resizer", "image-compressor", "image-watermark", "image-cropper", "remove-background"],
			"minWidth": 300,
			"minHeight": 300
		},

		"app.leonardo.ai": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"stability.ai": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"dream.ai": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"ideogram.ai": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"playground.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"civitai.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "to-webp", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"adobe.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-cropper", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"bing.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"openai.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"chatgpt.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"claude.ai": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-cropper", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"gemini.google.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"kimi.moonshot.cn": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"yuanbao.tencent.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"tongyi.aliyun.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"yuewen.cn": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark"],
			"minWidth": 200,
			"minHeight": 200
		},

		"xinghuo.xfyun.cn": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark"],
			"minWidth": 200,
			"minHeight": 200
		},

		"hailuoai.video": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"jimeng.jianying.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background", "to-webp"],
			"minWidth": 200,
			"minHeight": 200,
			"imageSelector": "img[src*='byteimg.com']",
			"skipContainerSelector": "header, nav"
		},

		"xingyuan.baidu.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"poe.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"perplexity.ai": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"grok.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"pinterest.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "remove-background", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"unsplash.com": {
			"quickTool": "image-compressor",
			"menuTools": ["image-compressor", "image-resizer", "image-watermark", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"instagram.com": {
			"quickTool": "instagram-resizer",
			"menuTools": ["instagram-resizer", "image-compressor", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		},

		"twitter.com": {
			"quickTool": "image-resizer",
			"menuTools": ["image-resizer", "image-compressor", "image-watermark", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"x.com": {
			"quickTool": "image-resizer",
			"menuTools": ["image-resizer", "image-compressor", "image-watermark", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"youtube.com": {
			"quickTool": "youtube-thumbnail-resizer",
			"menuTools": ["youtube-thumbnail-resizer", "image-compressor", "image-watermark", "to-webp"],
			"minWidth": 200,
			"minHeight": 200
		},

		"facebook.com": {
			"quickTool": "facebook-image-resizer",
			"menuTools": ["facebook-image-resizer", "image-compressor", "image-watermark", "remove-background"],
			"minWidth": 200,
			"minHeight": 200
		}

	}
};