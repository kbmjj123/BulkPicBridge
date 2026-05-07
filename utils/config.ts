/**
 * 内置兜底配置
 * 在无网络 / R2 故障 / 首次安装还没拉到配置时使用
 */
export const DEFAULT_CONFIG: RemoteConfig = {
  version: '1.0.0',
  updatedAt: '2024-01-01',
  blacklist: [
    'mail.google.com',
    'docs.google.com',
    'sheets.google.com',
    'slides.google.com',
  ],
  imageFilter: {
    minWidth: 200,
    minHeight: 200,
  },
  tools: [
    {
      slug: 'image-compressor',
      label: { zh: '压缩图片', en: 'Compress', ja: '圧縮' },
      icon: 'file-zip',
      enabled: true,
      order: 1,
    },
    {
      slug: 'image-resizer',
      label: { zh: '尺寸调整', en: 'Resize', ja: 'リサイズ' },
      icon: 'scaling',
      enabled: true,
      order: 2,
    },
    {
      slug: 'image-cropper',
      label: { zh: '裁剪图片', en: 'Crop', ja: 'トリミング' },
      icon: 'image-cropper',
      enabled: true,
      order: 3,
    },
    {
      slug: 'image-watermark',
      label: { zh: '添加水印', en: 'Add Watermark', ja: '透かし追加' },
      icon: 'stamp',
      enabled: true,
      order: 4,
    },
    {
      slug: 'watermark-remove',
      label: { zh: '去除水印', en: 'Remove Watermark', ja: '透かし削除' },
      icon: 'eraser',
      enabled: false,
      order: 5,
    },
  ],
  sites: {
    default: {
      quickTool: 'image-compressor',
      menuTools: ['image-compressor', 'image-resizer', 'image-cropper', 'image-watermark'],
      minWidth: 200,
      minHeight: 200,
    },
    'doubao.com': {
      quickTool: 'image-compressor',
      menuTools: ['image-compressor', 'image-resizer', 'image-cropper', 'image-watermark'],
      minWidth: 200,
      minHeight: 200,
      imageSelector: "img[src*='byteimg.com']",
      skipContainerSelector: "header, nav, [data-testid='file_drop_area']",
    },
    'midjourney.com': {
      quickTool: 'image-resizer',
      menuTools: ['image-resizer', 'image-compressor', 'image-cropper', 'image-watermark'],
      minWidth: 300,
      minHeight: 300,
    },
    'app.leonardo.ai': {
      quickTool: 'image-compressor',
      menuTools: ['image-compressor', 'image-resizer', 'image-watermark'],
      minWidth: 200,
      minHeight: 200,
    },
  },
};