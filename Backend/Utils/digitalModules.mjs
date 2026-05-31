const PREVIEWABLE_FILE_KINDS = new Set(['document', 'video', 'audio', 'image']);

const trimText = (value = '') => String(value || '').trim();
const toPositiveNumberOrNull = (value) => {
  if (value === '' || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const numericSortValue = (value, fallback = Number.MAX_SAFE_INTEGER) => (
  Number.isFinite(Number(value)) ? Number(value) : fallback
);

export const isPreviewableDigitalFile = (file = {}) => PREVIEWABLE_FILE_KINDS.has(String(file.fileKind || '').trim());

export const buildModuleBlockAssetId = (itemId = '', blockId = '') => {
  const normalizedItemId = trimText(itemId);
  const normalizedBlockId = trimText(blockId);
  if (!normalizedItemId || !normalizedBlockId) return '';
  return `${normalizedItemId}__block__${normalizedBlockId}`;
};

export const flattenTextBlocksToContent = (blocks = []) => (
  (Array.isArray(blocks) ? blocks : [])
    .filter((block) => String(block?.kind || '').trim().toLowerCase() === 'text')
    .map((block) => String(block?.content || '').trim())
    .filter(Boolean)
    .join('\n\n')
);

export const normalizeDigitalLessonBlock = (block = {}, index = 0) => {
  const explicitKind = String(block.kind || '').trim().toLowerCase();
  const kind = explicitKind === 'file' || block.secureUrl
    ? 'file'
    : explicitKind === 'link' || block.url
      ? 'link'
      : 'text';
  const order = toPositiveNumberOrNull(block.order) ?? index + 1;
  const blockId = block.blockId || '';
  const base = {
    ...(block._id ? { _id: block._id } : {}),
    ...(blockId ? { blockId: String(blockId) } : {}),
    kind,
    order,
    title: trimText(block.title || block.label || block.originalFilename || ''),
    description: trimText(block.description || ''),
  };

  if (kind === 'text') {
    return {
      ...base,
      content: String(block.content || ''),
      url: '',
      openInNewTab: true,
      allowDownload: false,
      secureUrl: '',
      publicId: '',
      originalFilename: '',
      downloadName: '',
      mimeType: '',
      resourceType: 'raw',
      fileKind: 'other',
      bytes: 0,
    };
  }

  if (kind === 'link') {
    return {
      ...base,
      content: '',
      url: trimText(block.url || ''),
      openInNewTab: block.openInNewTab !== false,
      allowDownload: false,
      secureUrl: '',
      publicId: '',
      originalFilename: '',
      downloadName: '',
      mimeType: '',
      resourceType: 'raw',
      fileKind: 'other',
      bytes: 0,
    };
  }

  const fileKind = trimText(block.fileKind || 'other') || 'other';
  return {
    ...base,
    content: '',
    url: '',
    openInNewTab: true,
    allowDownload: !!block.allowDownload || !isPreviewableDigitalFile({ fileKind }),
    secureUrl: trimText(block.secureUrl || ''),
    publicId: trimText(block.publicId || ''),
    originalFilename: trimText(block.originalFilename || ''),
    downloadName: trimText(block.downloadName || block.originalFilename || ''),
    mimeType: trimText(block.mimeType || ''),
    resourceType: trimText(block.resourceType || 'raw') || 'raw',
    fileKind,
    bytes: Math.max(0, Number(block.bytes) || 0),
  };
};

export const digitalLessonBlockHasContent = (block = {}) => {
  const kind = String(block.kind || 'text').trim().toLowerCase();
  if (kind === 'file') return !!trimText(block.secureUrl || '');
  if (kind === 'link') return !!trimText(block.url || block.title || block.description || '');
  return !!trimText(block.content || block.title || block.description || '');
};

export const sortDigitalLessonBlocks = (blocks = []) => [...blocks].sort((a, b) => {
  const orderDiff = numericSortValue(a.order) - numericSortValue(b.order);
  if (orderDiff !== 0) return orderDiff;
  return trimText(a.title || a.originalFilename || a.url || '').localeCompare(trimText(b.title || b.originalFilename || b.url || ''));
});

export const normalizeDigitalTextItemBlocks = (item = {}) => {
  const explicitBlocks = Array.isArray(item.blocks) ? item.blocks : [];
  const normalizedBlocks = sortDigitalLessonBlocks(
    explicitBlocks
      .map((block, blockIndex) => normalizeDigitalLessonBlock(block, blockIndex))
      .filter((block) => digitalLessonBlockHasContent(block))
  );
  if (normalizedBlocks.length) return normalizedBlocks;

  const fallbackContent = String(item.content || '');
  if (trimText(fallbackContent)) {
    return [normalizeDigitalLessonBlock({
      kind: 'text',
      order: 1,
      content: fallbackContent,
    }, 0)];
  }

  return [];
};

export const normalizeDigitalModuleItem = (item = {}, index = 0) => {
  const kind = String(item.kind || (item.secureUrl ? 'file' : 'text')).trim().toLowerCase() === 'file'
    ? 'file'
    : 'text';
  const order = toPositiveNumberOrNull(item.order) ?? index + 1;
  const title = trimText(item.title || item.label || item.stepTitle || '');
  const description = trimText(item.description || item.summary || item.stepSummary || '');
  const itemId = item.itemId || '';
  const base = {
    ...(item._id ? { _id: item._id } : {}),
    ...(itemId ? { itemId: String(itemId) } : {}),
    kind,
    order,
    title,
    description,
  };

  if (kind === 'text') {
    const blocks = normalizeDigitalTextItemBlocks(item);
    return {
      ...base,
      content: blocks.length ? flattenTextBlocksToContent(blocks) : String(item.content || ''),
      blocks,
      allowDownload: false,
      secureUrl: '',
      publicId: '',
      originalFilename: '',
      downloadName: '',
      mimeType: '',
      resourceType: 'raw',
      fileKind: 'other',
      bytes: 0,
    };
  }

  const fileKind = trimText(item.fileKind || 'other') || 'other';
  return {
    ...base,
    content: '',
    blocks: [],
    allowDownload: !!item.allowDownload || !isPreviewableDigitalFile({ fileKind }),
    secureUrl: trimText(item.secureUrl || ''),
    publicId: trimText(item.publicId || ''),
    originalFilename: trimText(item.originalFilename || ''),
    downloadName: trimText(item.downloadName || item.originalFilename || ''),
    mimeType: trimText(item.mimeType || ''),
    resourceType: trimText(item.resourceType || 'raw') || 'raw',
    fileKind,
    bytes: Math.max(0, Number(item.bytes) || 0),
  };
};

export const digitalModuleItemHasContent = (item = {}) => {
  if ((item.kind || 'text') === 'file') return !!trimText(item.secureUrl || '');
  return !!trimText(item.title || item.description || item.content || '') || (normalizeDigitalTextItemBlocks(item).length > 0);
};

export const sortDigitalModuleItems = (items = []) => [...items].sort((a, b) => {
  const orderDiff = numericSortValue(a.order) - numericSortValue(b.order);
  if (orderDiff !== 0) return orderDiff;
  return trimText(a.title || a.originalFilename || '').localeCompare(trimText(b.title || b.originalFilename || ''));
});

export const normalizeDigitalModule = (module = {}, index = 0) => {
  const moduleNumber = toPositiveNumberOrNull(module.moduleNumber ?? module.stepNumber ?? module.pageNumber) ?? index + 1;
  const title = trimText(module.title || module.stepTitle || '');
  const description = trimText(module.description || module.summary || module.stepSummary || '');
  const moduleId = module.moduleId || '';
  const items = sortDigitalModuleItems(
    (Array.isArray(module.items) ? module.items : [])
      .map((item, itemIndex) => normalizeDigitalModuleItem(item, itemIndex))
      .filter((item) => digitalModuleItemHasContent(item))
  );

  return {
    ...(module._id ? { _id: module._id } : {}),
    ...(moduleId ? { moduleId: String(moduleId) } : {}),
    moduleNumber,
    title,
    description,
    items,
  };
};

export const digitalModuleHasContent = (module = {}) => (
  (Array.isArray(module.items) ? module.items.length : 0) > 0
  || !!trimText(module.title || '')
  || !!trimText(module.description || '')
);

export const sortDigitalModules = (modules = []) => [...modules].sort((a, b) => {
  const moduleDiff = numericSortValue(a.moduleNumber) - numericSortValue(b.moduleNumber);
  if (moduleDiff !== 0) return moduleDiff;
  return trimText(a.title || '').localeCompare(trimText(b.title || ''));
});

export const normalizeDigitalModules = (modules = []) => sortDigitalModules(
  (Array.isArray(modules) ? modules : [])
    .map((module, index) => normalizeDigitalModule(module, index))
    .filter((module) => digitalModuleHasContent(module))
);

const buildLegacyTextItem = (page = {}, order = 1) => normalizeDigitalModuleItem({
  _id: page._id,
  itemId: page.pageId || '',
  kind: 'text',
  order,
  title: page.title || '',
  description: page.summary || '',
  content: page.content || '',
}, order - 1);

const buildLegacyFileItem = (file = {}, order = 1) => normalizeDigitalModuleItem({
  _id: file._id,
  itemId: file.itemId || file.assetId || '',
  kind: 'file',
  order,
  title: file.title || file.stepTitle || file.label || file.originalFilename || '',
  description: file.description || file.stepSummary || '',
  allowDownload: file.allowDownload,
  secureUrl: file.secureUrl,
  publicId: file.publicId,
  originalFilename: file.originalFilename,
  downloadName: file.downloadName,
  mimeType: file.mimeType,
  resourceType: file.resourceType,
  fileKind: file.fileKind,
  bytes: file.bytes,
}, order - 1);

export const buildLegacyDigitalModulesFromCollections = ({
  digitalManualPages = [],
  digitalFiles = [],
} = {}) => {
  const files = [...(Array.isArray(digitalFiles) ? digitalFiles : [])]
    .filter((file) => file?.secureUrl)
    .sort((a, b) => {
      const stepDiff = numericSortValue(a.stepNumber) - numericSortValue(b.stepNumber);
      if (stepDiff !== 0) return stepDiff;
      return trimText(a.label || a.originalFilename || '').localeCompare(trimText(b.label || b.originalFilename || ''));
    });
  const filesByPublicId = new Map(
    files
      .filter((file) => trimText(file.publicId))
      .map((file) => [trimText(file.publicId), file])
  );
  const usedPublicIds = new Set();
  const modules = [];

  [...(Array.isArray(digitalManualPages) ? digitalManualPages : [])]
    .sort((a, b) => {
      const pageDiff = numericSortValue(a.pageNumber) - numericSortValue(b.pageNumber);
      if (pageDiff !== 0) return pageDiff;
      return trimText(a.title || '').localeCompare(trimText(b.title || ''));
    })
    .forEach((page, index) => {
      const linkedFile = filesByPublicId.get(trimText(page.mediaPublicId || '')) || null;
      if (linkedFile?.publicId) usedPublicIds.add(trimText(linkedFile.publicId));
      const items = [
        buildLegacyTextItem(page, 1),
        ...(linkedFile ? [buildLegacyFileItem(linkedFile, 2)] : []),
      ].filter((item) => digitalModuleItemHasContent(item));
      if (!items.length) return;
      modules.push(normalizeDigitalModule({
        _id: page._id,
        moduleId: page.pageId || '',
        moduleNumber: page.pageNumber ?? index + 1,
        title: page.title || '',
        description: page.summary || '',
        items,
      }, modules.length));
    });

  files
    .filter((file) => !trimText(file.publicId) || !usedPublicIds.has(trimText(file.publicId)))
    .forEach((file, index) => {
      const item = buildLegacyFileItem(file, 1);
      if (!digitalModuleItemHasContent(item)) return;
      modules.push(normalizeDigitalModule({
        _id: file._id,
        moduleId: file.assetId || '',
        moduleNumber: file.stepNumber ?? modules.length + 1,
        title: file.stepTitle || file.label || file.originalFilename || `Module ${modules.length + 1}`,
        description: file.stepSummary || '',
        items: [item],
      }, modules.length + index));
    });

  return normalizeDigitalModules(modules);
};
