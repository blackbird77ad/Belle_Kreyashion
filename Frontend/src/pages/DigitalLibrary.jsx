import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Circle,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  Phone,
  PlayCircle,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import CustomerModal from '../components/CustomerModal';
import SEO from '../components/SEO';
import { api } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import { generateCertificate } from '../utils/generateCertificate';

const fileIcon = (kind) => {
  if (kind === 'video') return <PlayCircle size={16} />;
  if (kind === 'image') return <ImageIcon size={16} />;
  return <FileText size={16} />;
};

const formatBytes = (bytes = 0) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
};

const formatShortDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const validateEmail = (raw = '') => {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return 'Enter the email address where your certificate should be sent.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return 'Enter a valid email address.';
  return null;
};

const validatePhone = (raw = '') => {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (!cleaned) return 'Enter the learner phone or WhatsApp number.';
  if (!/^\+?\d+$/.test(cleaned)) return 'Phone number can only contain digits and an optional + sign.';
  if (cleaned.startsWith('0') && cleaned.length !== 10) return 'Ghana phone numbers should be 10 digits.';
  if ((cleaned.startsWith('+233') || cleaned.startsWith('233')) && cleaned.replace(/^\+/, '').length !== 12) {
    return 'Ghana numbers with country code should be 12 digits.';
  }
  if (cleaned.startsWith('+') && (cleaned.length < 8 || cleaned.length > 16)) {
    return 'International numbers should include a valid country code.';
  }
  return null;
};

const normalizePhone = (raw = '') => {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('233') && !cleaned.startsWith('+')) return `+${cleaned}`;
  return cleaned;
};

const LIBRARY_FILTERS = [
  { key: 'all', label: 'All Access' },
  { key: 'paid', label: 'Paid' },
  { key: 'trial', label: 'Trial' },
  { key: 'free', label: 'Free' },
  { key: 'certified', label: 'Certified' },
];

const buildSecureViewerUrl = (file, url) => {
  if (!url) return '';
  const isPdf = String(file?.mimeType || '').includes('pdf')
    || String(file?.originalFilename || '').toLowerCase().endsWith('.pdf');
  return isPdf ? `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH` : url;
};

const normalizeSupportWhatsApp = (value = '') => {
  const cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  if (cleaned.startsWith('0') && cleaned.length === 10) return `233${cleaned.slice(1)}`;
  return cleaned;
};

const buildSupportEmailLink = (email = '', productName = '') => {
  if (!email) return '';
  const subject = encodeURIComponent(`Support needed for ${productName || 'digital training'}`);
  const body = encodeURIComponent(`Hello trainer,\n\nI need help with ${productName || 'my digital training'} inside the Belle Kreyashon web library.\n\nThank you.`);
  return `mailto:${email}?subject=${subject}&body=${body}`;
};

const buildSupportWhatsAppLink = (phone = '', productName = '') => {
  const normalized = normalizeSupportWhatsApp(phone);
  if (!normalized) return '';
  const text = encodeURIComponent(`Hello trainer, I need help with ${productName || 'my digital training'} inside the Belle Kreyashon web library.`);
  return `https://wa.me/${normalized}?text=${text}`;
};

const DEFAULT_CONTENTS_TITLE_STYLE = {
  color: '#111827',
  fontSize: 32,
  fontFamily: 'Georgia, serif',
  fontWeight: '700',
  fontStyle: 'normal',
  textTransform: 'none',
  textDecoration: 'none',
};

const DEFAULT_CONTENTS_SUBTITLE_STYLE = {
  color: '#4B5563',
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  fontWeight: '500',
  fontStyle: 'normal',
  textTransform: 'none',
  textDecoration: 'none',
};

const DEFAULT_WRITING_BLOCK_TEXT_STYLE = {
  color: '#374151',
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  fontWeight: '400',
  fontStyle: 'normal',
  textTransform: 'none',
  textDecoration: 'none',
};

const buildTextPresentationStyle = (style = {}, defaults = {}) => {
  const merged = { ...defaults, ...(style || {}) };
  const fontSize = Number(merged.fontSize);
  return {
    color: merged.color || undefined,
    fontSize: Number.isFinite(fontSize) ? `${fontSize}px` : undefined,
    fontFamily: merged.fontFamily || undefined,
    fontWeight: merged.fontWeight || undefined,
    fontStyle: merged.fontStyle || undefined,
    textTransform: merged.textTransform || undefined,
    textDecoration: merged.textDecoration || undefined,
  };
};

const normalizeWritingBlockTextStyle = (style = {}) => {
  const fontSize = Number(style?.fontSize);
  const color = String(style?.color || '').trim();
  return {
    color: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color.toUpperCase() : DEFAULT_WRITING_BLOCK_TEXT_STYLE.color,
    fontSize: Number.isFinite(fontSize) ? Math.min(64, Math.max(12, Math.round(fontSize))) : DEFAULT_WRITING_BLOCK_TEXT_STYLE.fontSize,
    fontFamily: style?.fontFamily || DEFAULT_WRITING_BLOCK_TEXT_STYLE.fontFamily,
    fontWeight: style?.fontWeight || DEFAULT_WRITING_BLOCK_TEXT_STYLE.fontWeight,
    fontStyle: style?.fontStyle === 'italic' ? 'italic' : 'normal',
    textTransform: style?.textTransform || DEFAULT_WRITING_BLOCK_TEXT_STYLE.textTransform,
    textDecoration: style?.textDecoration === 'underline' ? 'underline' : 'none',
  };
};

const normalizeWritingBlockPresentation = (presentation = {}) => {
  const highlightColor = String(presentation?.highlightColor || '').trim();
  return {
    labelMode: presentation?.labelMode === 'lesson' ? 'lesson' : 'none',
    highlightColor: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(highlightColor) ? highlightColor.toUpperCase() : '',
    textStyle: normalizeWritingBlockTextStyle(presentation?.textStyle || {}),
  };
};

const buildWritingBlockInlineStyle = (
  presentation = {},
  { includeHighlight = true, includeColor = true, includeWeight = true } = {}
) => {
  const normalized = normalizeWritingBlockPresentation(presentation);
  return {
    ...(includeColor ? { color: normalized.textStyle.color } : {}),
    fontSize: `${normalized.textStyle.fontSize}px`,
    fontFamily: normalized.textStyle.fontFamily,
    ...(includeWeight ? { fontWeight: normalized.textStyle.fontWeight } : {}),
    fontStyle: normalized.textStyle.fontStyle,
    textTransform: normalized.textStyle.textTransform,
    textDecoration: normalized.textStyle.textDecoration,
    ...(includeHighlight && normalized.highlightColor ? { backgroundColor: normalized.highlightColor } : {}),
  };
};

const buildWritingBlockTitleStyle = (presentation = {}) => {
  const normalized = normalizeWritingBlockPresentation(presentation);
  return {
    ...buildWritingBlockInlineStyle(normalized, { includeHighlight: false }),
    fontSize: `${Math.min(72, normalized.textStyle.fontSize + 4)}px`,
    fontWeight: Number(normalized.textStyle.fontWeight) >= 600 ? normalized.textStyle.fontWeight : '600',
  };
};

const parseWritingBlockTitleLines = (title = '') => String(title || '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const stripRichTextHtmlToPlainText = (html = '') => {
  const source = String(html || '');
  if (!source.trim()) return '';
  if (typeof document === 'undefined') {
    return source
      .replace(/<\/(p|div)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = source
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return String(textarea.value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
};

const sanitizeRichTextHtml = (html = '') => {
  const source = String(html || '').trim();
  if (!source || typeof DOMParser === 'undefined') return source;
  const parser = new DOMParser();
  const documentRoot = parser.parseFromString(`<div>${source}</div>`, 'text/html');
  const root = documentRoot.body.firstElementChild || documentRoot.body;
  const allowedTags = new Set(['P', 'DIV', 'BR', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'MARK']);
  const allowedStyleKeys = new Set(['color', 'background-color', 'font-family', 'font-size', 'font-style', 'font-weight', 'text-decoration']);
  const unwrapElement = (element) => {
    if (!element?.parentNode) return;
    while (element.firstChild) element.parentNode.insertBefore(element.firstChild, element);
    element.remove();
  };
  const sanitizeStyleValue = (key = '', value = '') => {
    const normalizedKey = String(key || '').trim().toLowerCase();
    const normalizedValue = String(value || '').trim();
    if (!allowedStyleKeys.has(normalizedKey) || !normalizedValue) return '';
    if (normalizedKey === 'color' || normalizedKey === 'background-color') {
      return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalizedValue)
        || /^rgb(a)?\([\d\s.,%]+\)$/i.test(normalizedValue)
        || /^[a-z]+$/i.test(normalizedValue)
        ? normalizedValue
        : '';
    }
    if (normalizedKey === 'font-family') {
      return /^[\w\s"',-]+$/.test(normalizedValue) ? normalizedValue : '';
    }
    if (normalizedKey === 'font-size') {
      return /^\d+(px|pt|em|rem|%)$/i.test(normalizedValue) ? normalizedValue : '';
    }
    if (normalizedKey === 'font-style') {
      return /^(normal|italic)$/i.test(normalizedValue) ? normalizedValue : '';
    }
    if (normalizedKey === 'font-weight') {
      return /^(normal|bold|[1-9]00)$/i.test(normalizedValue) ? normalizedValue : '';
    }
    if (normalizedKey === 'text-decoration') {
      return /^(none|underline)$/i.test(normalizedValue) ? normalizedValue : '';
    }
    return '';
  };
  const sanitizeNode = (node) => {
    if (!node) return;
    if (node.nodeType === 3) return;
    if (node.nodeType !== 1) {
      node.remove();
      return;
    }
    if (!allowedTags.has(node.tagName)) {
      const childNodes = Array.from(node.childNodes);
      unwrapElement(node);
      childNodes.forEach(sanitizeNode);
      return;
    }
    Array.from(node.attributes).forEach((attribute) => {
      if (attribute.name !== 'style') node.removeAttribute(attribute.name);
    });
    if (node.hasAttribute('style')) {
      const nextStyle = String(node.getAttribute('style') || '')
        .split(';')
        .map((rule) => rule.trim())
        .filter(Boolean)
        .map((rule) => {
          const [rawKey, ...rawValueParts] = rule.split(':');
          const cleanKey = String(rawKey || '').trim().toLowerCase();
          const cleanValue = sanitizeStyleValue(cleanKey, rawValueParts.join(':'));
          return cleanValue ? `${cleanKey}:${cleanValue}` : '';
        })
        .filter(Boolean)
        .join(';');
      if (nextStyle) {
        node.setAttribute('style', nextStyle);
      } else {
        node.removeAttribute('style');
      }
    }
    Array.from(node.childNodes).forEach(sanitizeNode);
  };
  Array.from(root.childNodes).forEach(sanitizeNode);
  return root.innerHTML.trim();
};
const richTextHtmlHasFormatting = (html = '') => /<(strong|b|em|i|u|mark|span|font)\b/i.test(String(html || ''))
  || /style\s*=/i.test(String(html || ''));

const splitLessonTextIntoSentences = (content = '') => {
  const source = String(content || '').trim();
  if (!source) return [];
  let sentenceIndex = 0;
  return source
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const rawSentences = paragraph.match(/[^.!?\n]+(?:[.!?]+|$)/g) || [paragraph];
      return rawSentences
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .map((sentence) => ({
          text: sentence,
          sentenceIndex: sentenceIndex++,
        }));
    });
};

const buildTextLessonReaderBlocks = (blocks = [], fallbackContent = '') => {
  const sourceBlocks = Array.isArray(blocks) && blocks.length
    ? blocks
    : [{ kind: 'text', order: 1, content: fallbackContent }];
  let sentenceIndex = 0;
  let textBlockIndex = 0;

  return sourceBlocks.map((block, blockIndex) => {
    if (block.kind === 'file') {
      return {
        blockId: block.blockId || `block-${blockIndex + 1}`,
        order: block.order ?? blockIndex + 1,
        kind: 'file',
        title: block.title || block.label || 'Attachment',
        description: block.description || '',
        assetId: block.assetId || '',
        allowDownload: !!block.allowDownload,
        fileKind: block.fileKind || 'other',
        canPreview: !!block.canPreview,
        bytes: block.bytes || 0,
      };
    }

    if (block.kind === 'link') {
      return {
        blockId: block.blockId || `block-${blockIndex + 1}`,
        order: block.order ?? blockIndex + 1,
        kind: 'link',
        title: block.title || 'Reference link',
        description: block.description || '',
        url: block.url || '',
        openInNewTab: block.openInNewTab !== false,
      };
    }

    const contentHtml = sanitizeRichTextHtml(block.contentHtml || '');
    const plainTextContent = String(block.content || '').trim() || stripRichTextHtmlToPlainText(contentHtml || '');
    const paragraphGroups = splitLessonTextIntoSentences(plainTextContent);
    const paragraphs = paragraphGroups.map((paragraph) => paragraph.map((sentence) => ({
      ...sentence,
      sentenceIndex: sentenceIndex++,
    })));
    textBlockIndex += 1;
    const presentation = normalizeWritingBlockPresentation(block.presentation || {});
    const markerIndex = 100000 + textBlockIndex;
    const markerLabel = parseWritingBlockTitleLines(block.title || '')[0]
      || plainTextContent.slice(0, 120)
      || `Lesson block ${textBlockIndex}`;
    return {
      blockId: block.blockId || `block-${blockIndex + 1}`,
      order: block.order ?? blockIndex + 1,
      kind: 'text',
      titleLines: parseWritingBlockTitleLines(block.title || ''),
      presentation,
      lessonLabel: presentation.labelMode === 'lesson' ? `LESSON ${textBlockIndex}` : '',
      contentHtml,
      usesRichText: richTextHtmlHasFormatting(contentHtml),
      markerIndex,
      markerLabel,
      paragraphs,
      content: plainTextContent,
    };
  });
};

const sortModuleItems = (items = []) => [...items].sort((a, b) => {
  const orderDiff = Number(a?.order ?? Number.MAX_SAFE_INTEGER) - Number(b?.order ?? Number.MAX_SAFE_INTEGER);
  if (orderDiff !== 0) return orderDiff;
  return String(a?.title || a?.label || '').localeCompare(String(b?.title || b?.label || ''));
});

const sortLessonBlocks = (blocks = []) => [...blocks].sort((a, b) => {
  const orderDiff = Number(a?.order ?? Number.MAX_SAFE_INTEGER) - Number(b?.order ?? Number.MAX_SAFE_INTEGER);
  if (orderDiff !== 0) return orderDiff;
  return String(a?.title || a?.originalFilename || a?.url || '').localeCompare(String(b?.title || b?.originalFilename || b?.url || ''));
});

const buildContentsWritingBlockEntries = (lessonItem = {}) => {
  if (String(lessonItem?.kind || '').trim().toLowerCase() !== 'text') return [];
  let textBlockCount = 0;
  return sortLessonBlocks(lessonItem.blocks || [])
    .map((block, blockIndex) => {
      if (String(block?.kind || '').trim().toLowerCase() !== 'text') return null;
      textBlockCount += 1;
      const titleLines = parseWritingBlockTitleLines(block.title || '');
      if (!titleLines.length) return null;
      const presentation = normalizeWritingBlockPresentation(block.presentation || {});
      return {
        blockKey: String(block.blockId || block._id || `${lessonItem.itemId || 'lesson'}-contents-block-${blockIndex + 1}`),
        lessonLabel: presentation.labelMode === 'lesson' ? `LESSON ${textBlockCount}` : '',
        titleLines,
      };
    })
    .filter(Boolean);
};

const buildContentsReaderState = ({ libraryItem = {} } = {}) => ({
  readerType: 'table-of-contents',
  grantId: libraryItem._id,
  productId: libraryItem.productId,
  productName: libraryItem.productName,
  supportEmail: libraryItem.supportEmail || '',
  supportWhatsApp: libraryItem.supportWhatsApp || '',
  title: libraryItem?.digitalContentsPage?.title || 'Table of Contents',
  summary: libraryItem?.digitalContentsPage?.subtitle || 'Choose any module or lesson below to continue from the right place.',
  titleStyle: libraryItem?.digitalContentsPage?.titleStyle || DEFAULT_CONTENTS_TITLE_STYLE,
  summaryStyle: libraryItem?.digitalContentsPage?.subtitleStyle || DEFAULT_CONTENTS_SUBTITLE_STYLE,
  modules: (libraryItem.modules || []).map((module) => ({
    ...module,
    items: sortModuleItems(module.items || []),
  })),
});

const findLibraryModule = (libraryItem = {}, moduleId = '') => (
  (libraryItem.modules || []).find((module) => module.moduleId === moduleId) || null
);

const findLibraryModuleItem = (module = {}, itemId = '') => (
  (module.items || []).find((item) => item.itemId === itemId || item.assetId === itemId) || null
);

const buildTextReaderState = ({ libraryItem = {}, module = {}, lessonItem = {} } = {}) => ({
  readerType: 'module-text',
  grantId: libraryItem._id,
  productId: libraryItem.productId,
  productName: libraryItem.productName,
  supportEmail: libraryItem.supportEmail || '',
  supportWhatsApp: libraryItem.supportWhatsApp || '',
  moduleId: module.moduleId,
  moduleNumber: module.moduleNumber,
  moduleTitle: module.title || '',
  moduleDescription: module.description || '',
  itemId: lessonItem.itemId,
  title: lessonItem.title || '',
  summary: lessonItem.description || '',
  content: lessonItem.content || '',
  blocks: buildTextLessonReaderBlocks(lessonItem.blocks || [], lessonItem.content || ''),
  savedSentenceIndex: lessonItem.savedSentenceIndex ?? null,
  savedSentenceText: lessonItem.savedSentenceText || '',
  lastPositionUpdatedAt: module.lastPositionUpdatedAt || null,
});

const applyModuleProgressUpdateToLibrary = (library = [], grantId = '', payload = {}) => library.map((entry) => {
  if (entry._id !== grantId) return entry;
  const nextModuleProgress = payload.moduleProgress || null;
  const nextModuleId = payload.moduleId || nextModuleProgress?.moduleId || '';
  return {
    ...entry,
    progress: payload.progress || entry.progress,
    certificateStatus: payload.certificateStatus || entry.certificateStatus,
    modules: (entry.modules || []).map((module) => {
      if (!nextModuleId || module.moduleId !== nextModuleId) return module;
      return {
        ...module,
        openedAt: nextModuleProgress?.openedAt ?? module.openedAt,
        completedAt: nextModuleProgress?.completedAt ?? payload.completedAt ?? module.completedAt,
        lastItemId: nextModuleProgress?.lastItemId ?? module.lastItemId,
        lastItemType: nextModuleProgress?.lastItemType ?? module.lastItemType,
        lastItemTitle: nextModuleProgress?.lastItemTitle ?? module.lastItemTitle,
        lastPositionUpdatedAt: nextModuleProgress?.lastPositionUpdatedAt ?? module.lastPositionUpdatedAt,
        textMarker: nextModuleProgress?.textMarker ?? module.textMarker,
        items: (module.items || []).map((item) => ({
          ...item,
          isResumeTarget: (nextModuleProgress?.lastItemId ?? module.lastItemId) === item.itemId,
          savedSentenceIndex: (nextModuleProgress?.textMarker?.itemId ?? module.textMarker?.itemId) === item.itemId
            ? nextModuleProgress?.textMarker?.sentenceIndex ?? module.textMarker?.sentenceIndex ?? null
            : item.savedSentenceIndex,
          savedSentenceText: (nextModuleProgress?.textMarker?.itemId ?? module.textMarker?.itemId) === item.itemId
            ? nextModuleProgress?.textMarker?.sentenceText ?? module.textMarker?.sentenceText ?? ''
            : item.savedSentenceText,
        })),
      };
    }),
  };
});

export default function DigitalLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { customer } = useCustomer();
  const { removeOwnedDigitalItems } = useCart();
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState('');
  const [actioning, setActioning] = useState('');
  const [error, setError] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [search, setSearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [libraryPage, setLibraryPage] = useState(1);
  const [viewer, setViewer] = useState(null);
  const [manualReader, setManualReader] = useState(null);
  const [certificateTarget, setCertificateTarget] = useState(null);
  const [certificateForm, setCertificateForm] = useState({
    learnerName: '',
    learnerEmail: '',
    learnerPhone: '',
    notes: '',
  });
  const [certificateFormError, setCertificateFormError] = useState('');

  const loadLibrary = useCallback(async (showLoader = true) => {
    if (!customer?.accessToken) {
      setLibrary([]);
      if (showLoader) setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);
    setError('');

    try {
      const response = await api.get('/api/products/digital/library', {
        headers: { 'x-customer-token': customer.accessToken },
      });
      setLibrary(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your digital library right now.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    loadLibrary(true);
  }, [loadLibrary]);

  useEffect(() => {
    const ownedProductIds = library.map((item) => item.productId).filter(Boolean);
    if (!ownedProductIds.length) return;
    removeOwnedDigitalItems(ownedProductIds);
  }, [library, removeOwnedDigitalItems]);

  const filteredLibrary = library.filter((item) => {
    const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch = !normalizedSearch || [
        item.productName,
        item.productDesc,
        item.seriesTitle,
        item.digitalContentsPage?.title,
        item.digitalContentsPage?.subtitle,
        ...(item.modules || []).map((module) => `${module.title || ''} ${module.description || ''}`),
        ...(item.modules || []).flatMap((module) => (module.items || []).map((lessonItem) => (
          `${lessonItem.title || ''} ${lessonItem.description || ''} ${lessonItem.content || ''} ${lessonItem.fileKind || ''} ${(lessonItem.blocks || []).map((block) => `${block.title || ''} ${block.description || ''} ${block.content || ''} ${block.url || ''} ${block.fileKind || ''}`).join(' ')}`
        ))),
        ...(item.manualPages || []).map((page) => `${page.title || ''} ${page.summary || ''} ${page.content || ''}`),
        ...(item.files || []).map((file) => `${file.label || ''} ${file.stepTitle || ''} ${file.stepSummary || ''}`),
      ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch);

    const matchesFilter = libraryFilter === 'all'
      || (libraryFilter === 'paid' && item.digitalAccessKind === 'paid')
      || (libraryFilter === 'trial' && item.digitalAccessKind === 'trial')
      || (libraryFilter === 'free' && item.digitalAccessKind === 'free')
      || (libraryFilter === 'certified' && item.isCertified);

    return matchesSearch && matchesFilter;
  });
  const focusedProductId = searchParams.get('product') || '';
  const visibleLibrary = [...filteredLibrary].sort((a, b) => {
    const aFocused = focusedProductId && String(a.productId) === focusedProductId ? 1 : 0;
    const bFocused = focusedProductId && String(b.productId) === focusedProductId ? 1 : 0;
    return bFocused - aFocused;
  });
  const LIBRARY_PAGE_SIZE = 4;
  const totalLibraryPages = Math.ceil(visibleLibrary.length / LIBRARY_PAGE_SIZE);
  const pagedLibrary = visibleLibrary.slice(
    (libraryPage - 1) * LIBRARY_PAGE_SIZE,
    libraryPage * LIBRARY_PAGE_SIZE
  );

  useEffect(() => {
    setLibraryPage(1);
  }, [search, libraryFilter, focusedProductId]);

  const openAsset = async (grantId, assetId, mode = 'inline') => {
    if (!customer?.accessToken) {
      setShowCustomerModal(true);
      return;
    }

    const actionKey = `${grantId}-${assetId}-${mode}`;
    setOpening(actionKey);
    setError('');

    try {
      const { data } = await api.post(
        `/api/products/digital/library/${grantId}/assets/${assetId}`,
        { mode },
        { headers: { 'x-customer-token': customer.accessToken } }
      );

      if (mode === 'inline') {
        const libraryItem = library.find((item) => item._id === grantId);
        const file = libraryItem?.files?.find((entry) => entry.assetId === assetId)
          || libraryItem?.modules?.flatMap((module) => module.items || []).find((entry) => entry.kind === 'file' && entry.itemId === assetId);
        if (file) {
          setViewer({
            grantId,
            assetId,
            productName: libraryItem?.productName || 'Digital Product',
            customerName: libraryItem?.customerName || customer?.name || 'Belle Kreyashon customer',
            customerEmail: libraryItem?.customerEmail || customer?.email || '',
            supportEmail: libraryItem?.supportEmail || '',
            supportWhatsApp: libraryItem?.supportWhatsApp || '',
            file,
            url: buildSecureViewerUrl(file, data.url),
          });
        } else {
          window.open(data.url, '_blank', 'noopener,noreferrer');
        }
      } else {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
      window.setTimeout(() => loadLibrary(false), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not open this file right now.');
    } finally {
      setOpening('');
    }
  };

  const markModuleComplete = async (grantId, moduleId) => {
    if (!customer?.accessToken) {
      setShowCustomerModal(true);
      return;
    }

    const actionKey = `${grantId}-${moduleId}-complete`;
    setActioning(actionKey);
    setError('');

    try {
      const { data } = await api.post(
        `/api/products/digital/library/${grantId}/modules/${moduleId}/complete`,
        {},
        { headers: { 'x-customer-token': customer.accessToken } }
      );
      setLibrary((current) => applyModuleProgressUpdateToLibrary(current, grantId, {
        ...data,
        completedAt: new Date().toISOString(),
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not mark this module as complete right now.');
    } finally {
      setActioning('');
    }
  };

  const openTextLesson = async (grantId, moduleId, itemId) => {
    if (!customer?.accessToken) {
      setShowCustomerModal(true);
      return;
    }

    const actionKey = `${grantId}-${itemId}-text`;
    setActioning(actionKey);
    setError('');

    try {
      const { data } = await api.post(
        `/api/products/digital/library/${grantId}/modules/${moduleId}/items/${itemId}/progress`,
        {},
        { headers: { 'x-customer-token': customer.accessToken } }
      );
      const nextLibrary = applyModuleProgressUpdateToLibrary(library, grantId, data);
      setLibrary(nextLibrary);
      const libraryItem = nextLibrary.find((entry) => entry._id === grantId);
      const module = findLibraryModule(libraryItem, moduleId);
      const lessonItem = findLibraryModuleItem(module, itemId);
      if (libraryItem && module && lessonItem) {
        setManualReader(buildTextReaderState({ libraryItem, module, lessonItem }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not open this lesson right now.');
    } finally {
      setActioning('');
    }
  };

  const saveTextMarker = async (grantId, moduleId, itemId, sentenceIndex, sentenceText) => {
    if (!customer?.accessToken) {
      setShowCustomerModal(true);
      return;
    }

    const actionKey = `${grantId}-${itemId}-marker-${sentenceIndex}`;
    setActioning(actionKey);
    setError('');

    try {
      const { data } = await api.post(
        `/api/products/digital/library/${grantId}/modules/${moduleId}/items/${itemId}/progress`,
        { sentenceIndex, sentenceText },
        { headers: { 'x-customer-token': customer.accessToken } }
      );
      const nextLibrary = applyModuleProgressUpdateToLibrary(library, grantId, data);
      setLibrary(nextLibrary);
      const libraryItem = nextLibrary.find((entry) => entry._id === grantId);
      const module = findLibraryModule(libraryItem, moduleId);
      const lessonItem = findLibraryModuleItem(module, itemId);
      if (libraryItem && module && lessonItem) {
        setManualReader(buildTextReaderState({ libraryItem, module, lessonItem }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your place in this lesson right now.');
    } finally {
      setActioning('');
    }
  };

  const openModuleItem = (grantId, moduleId, lessonItem) => {
    if (!lessonItem) return;

    if (lessonItem.kind === 'text') {
      openTextLesson(grantId, moduleId, lessonItem.itemId);
      return;
    }

    openAsset(
      grantId,
      lessonItem.assetId || lessonItem.itemId,
      lessonItem.canPreview ? 'inline' : (lessonItem.allowDownload ? 'download' : 'inline')
    );
  };

  const openModuleResumeTarget = (grantId, module) => {
    const moduleItems = sortModuleItems(module?.items || []);
    const resumeItem = findLibraryModuleItem(module, module?.lastItemId) || moduleItems[0] || null;
    openModuleItem(grantId, module?.moduleId, resumeItem);
  };

  const continueModule = (libraryItem, module) => {
    openModuleResumeTarget(libraryItem._id, module);
  };

  const openContentsPage = (libraryItem) => {
    if (!customer?.accessToken) {
      setShowCustomerModal(true);
      return;
    }
    setManualReader(buildContentsReaderState({ libraryItem }));
  };

  const openCertificateRequest = (item) => {
    setCertificateFormError('');
    setCertificateTarget(item);
    setCertificateForm({
      learnerName: item?.customerName || customer?.name || '',
      learnerEmail: item?.customerEmail || customer?.email || '',
      learnerPhone: item?.customerPhone || customer?.phone || '',
      notes: '',
    });
  };

  const requestCertificate = async (grantId, payload) => {
    if (!customer?.accessToken) {
      setShowCustomerModal(true);
      return;
    }

    const actionKey = `${grantId}-certificate`;
    setActioning(actionKey);
    setError('');

    try {
      await api.post(
        `/api/products/digital/library/${grantId}/certificate-request`,
        payload,
        { headers: { 'x-customer-token': customer.accessToken } }
      );

      setLibrary((current) => current.map((item) => (
        item._id === grantId
          ? { ...item, certificateStatus: 'requested', certificateRequestedAt: new Date().toISOString() }
          : item
      )));
      setCertificateTarget(null);
      setCertificateFormError('');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not request the certificate right now.';
      setCertificateFormError(message);
      setError(message);
    } finally {
      setActioning('');
    }
  };

  const submitCertificateRequest = async () => {
    if (!certificateTarget?._id) return;

    const learnerName = certificateForm.learnerName.trim();
    const learnerEmail = certificateForm.learnerEmail.trim().toLowerCase();
    const learnerPhone = normalizePhone(certificateForm.learnerPhone.trim());
    const notes = certificateForm.notes.trim();

    if (!learnerName) {
      setCertificateFormError('Enter the full name exactly as it should appear on the certificate.');
      return;
    }

    const emailError = validateEmail(learnerEmail);
    if (emailError) {
      setCertificateFormError(emailError);
      return;
    }

    const phoneError = validatePhone(learnerPhone);
    if (phoneError) {
      setCertificateFormError(phoneError);
      return;
    }

    setCertificateFormError('');
    setError('');
    await requestCertificate(certificateTarget._id, {
      learnerName,
      learnerEmail,
      learnerPhone,
      notes,
    });
  };

  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <SEO
        title="Digital Library"
        description="Access your Belle Kreyashon digital products, free claims, trial access, files and protected learning materials."
        url="/digital-library"
        noindex
      />

      <div className="bg-black text-white py-14 px-4 text-center">
        <p className="text-[#FDC700] text-xs font-bold uppercase tracking-widest mb-2">Protected Access</p>
        <h1 className="text-3xl md:text-4xl font-extrabold">My Digital Library</h1>
        <p className="text-gray-300 text-sm max-w-2xl mx-auto mt-3 leading-relaxed">
          Free, trial and paid digital products stay behind secure access links. Open every module, complete your learning path, and request certificate review here when you are ready.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-gray-100 p-5 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fcfbf7] px-3 py-1.5 text-xs font-bold text-gray-600">
                <ShieldCheck size={14} className="text-[#FDC700]" />
                Secure customer-only access
              </div>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                Access links are issued temporarily and approved on up to two devices for the paying customer to reduce casual sharing.
              </p>
            </div>
            <Link
              to="/track"
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
            >
              View Orders
            </Link>
          </div>
        </div>

        {!customer?.accessToken && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#fcfbf7] mx-auto mb-4 flex items-center justify-center text-[#FDC700]">
              <Lock size={28} />
            </div>
            <h2 className="text-xl font-extrabold mb-2">Reconnect As The Purchasing Customer</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed mb-6">
              Use the same customer details you used when checking out so we can load your protected digital purchases.
            </p>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-black text-white font-bold text-sm hover:bg-gray-900"
            >
              Continue As Customer
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-16 text-center">
            <Loader2 size={28} className="animate-spin mx-auto mb-3 text-[#FDC700]" />
            <p className="font-bold text-gray-600">Loading your digital products...</p>
          </div>
        )}

        {!loading && customer?.accessToken && library.length === 0 && !error && (
          <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center">
            <BookOpen size={34} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-extrabold mb-2">No Digital Purchases Yet</h2>
            <p className="text-sm text-gray-500 mb-6">
              When you buy, claim or start a trial for a digital product, it will appear here automatically.
            </p>
            <Link
              to="/digital-products"
              className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-[#FDC700] text-black font-bold text-sm hover:bg-yellow-300"
            >
              Browse Digital Products
            </Link>
          </div>
        )}

        {!loading && library.length > 0 && (
          <div className="grid gap-5">
            {focusedProductId && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Focused Library Access</p>
                    <p className="text-sm font-bold text-emerald-900 mt-1">Your selected product is pinned to the top of the library list below.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.delete('product');
                      setSearchParams(next, { replace: true });
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 hover:border-emerald-400"
                  >
                    Clear Focus
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-gray-100 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search products, modules or lessons in your library..."
                    className="w-full rounded-2xl border border-gray-200 bg-[#fcfbf7] pl-10 pr-4 py-3 text-sm outline-none focus:border-black"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {LIBRARY_FILTERS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setLibraryFilter(option.key)}
                      className={`rounded-full border px-3 py-2 text-xs font-bold transition-all ${
                        libraryFilter === option.key
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-black'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {filteredLibrary.length} of {library.length} product{library.length === 1 ? '' : 's'} shown. Open modules on-site, and only files marked downloadable by admin will show a download action.
                {filteredLibrary.length > LIBRARY_PAGE_SIZE ? ` Page ${libraryPage} of ${totalLibraryPages}.` : ''}
              </p>
            </div>

            {filteredLibrary.length === 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center">
                <BookOpen size={34} className="mx-auto mb-4 text-gray-300" />
                <h2 className="text-xl font-extrabold mb-2">No library items match this search</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Try a different keyword or switch the library filter to see more of your active digital access.
                </p>
                <button
                  type="button"
                  onClick={() => { setSearch(''); setLibraryFilter('all'); }}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-black text-white font-bold text-sm hover:bg-gray-900"
                >
                  Clear Search
                </button>
              </div>
            )}

            {pagedLibrary.map((item) => {
              const certificateIssued = item.certificateStatus === 'generated' && (
                item.certificateIssued || item.certificate?.issued || item.certificate?.emailStatus === 'sent'
              );
              const isFocusedProduct = focusedProductId && String(item.productId) === focusedProductId;
              const supportEmailLink = buildSupportEmailLink(item.supportEmail || '', item.productName || '');
              const supportWhatsAppLink = buildSupportWhatsAppLink(item.supportWhatsApp || '', item.productName || '');
              const moduleCount = item.modules?.length || 0;
              const lessonItemCount = (item.modules || []).reduce((sum, module) => sum + (module.items?.length || 0), 0);
              const manualPageCount = item.manualPages?.length || 0;
              const fileCount = item.files?.length || 0;
              const hasModuleFlow = moduleCount > 0;

              return (
              <div key={item._id} className={`bg-white rounded-3xl border overflow-hidden ${
                isFocusedProduct ? 'border-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.08)]' : 'border-gray-100'
              }`}>
                <div className="grid lg:grid-cols-[minmax(300px,360px)_1fr] gap-0">
                  <div className="border-b border-gray-100 bg-[#fcfbf7] lg:border-b-0 lg:border-r">
                    {item.productImage ? (
                      <div className="flex h-full min-h-[260px] items-center justify-center p-5 sm:min-h-[320px] sm:p-6">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="max-h-[340px] w-full rounded-[28px] object-contain"
                          onError={(event) => { event.target.style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[260px] w-full items-center justify-center text-gray-300 sm:min-h-[320px]">
                        <BookOpen size={42} />
                      </div>
                    )}
                  </div>

                  <div className="p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FDC700] mb-2">
                          {item.digitalType || 'Digital Product'}
                        </p>
                        <h2 className="text-xl font-extrabold">{item.productName}</h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="rounded-full bg-[#fcfbf7] px-2.5 py-1 text-xs font-bold text-gray-600 capitalize border border-gray-200">
                            {item.digitalAccessKind === 'free' ? 'Free access' : item.digitalAccessKind === 'trial' ? 'Free trial' : 'Paid access'}
                          </span>
                          <span className="rounded-full bg-[#fcfbf7] px-2.5 py-1 text-xs font-bold text-gray-600 capitalize border border-gray-200">
                            {item.accessType === 'lifetime' ? 'Lifetime access' : `${item.accessMonths || 6} month access`}
                          </span>
                          {item.trialStatus === 'trialing' && item.trialEndsAt && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                              Trial ends {formatShortDate(item.trialEndsAt)}
                            </span>
                          )}
                          {item.trialStatus === 'trialing' && item.billingAmount > 0 && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-100">
                              Then GHS {Number(item.billingAmount).toLocaleString()}
                            </span>
                          )}
                          {item.isSeries && (
                            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 border border-purple-100">
                              Series
                            </span>
                          )}
                          {item.isCertified && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-100">
                              Certified
                            </span>
                          )}
                          {item.expiresAt && (
                            <span className="rounded-full bg-[#fcfbf7] px-2.5 py-1 text-xs font-bold text-gray-600 border border-gray-200">
                              Expires {formatShortDate(item.expiresAt)}
                            </span>
                          )}
                        </div>
                        {item.isSeries && item.seriesTitle && (
                          <p className="text-xs font-bold text-gray-700 mt-2">{item.seriesTitle}</p>
                        )}
                        {item.isSeries && item.seriesDescription && (
                          <p className="text-xs text-gray-500 mt-1">{item.seriesDescription}</p>
                        )}
                        {item.productDesc && (
                          <p className="text-sm text-gray-500 leading-relaxed mt-2 max-w-2xl">{item.productDesc}</p>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        <p className="font-bold text-gray-700">
                          {hasModuleFlow
                            ? `${moduleCount} module${moduleCount === 1 ? '' : 's'} | ${lessonItemCount} lesson item${lessonItemCount === 1 ? '' : 's'}`
                            : `${fileCount} file${fileCount !== 1 ? 's' : ''}${manualPageCount ? ` | ${manualPageCount} page${manualPageCount === 1 ? '' : 's'}` : ''}`}
                        </p>
                        <p>Order {item.orderId}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-4 mb-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400 mb-1">Learning Progress</p>
                          <p className="text-sm font-extrabold text-gray-800">
                            {hasModuleFlow
                              ? `${item.progress?.completedModules || 0} of ${item.progress?.totalModules || moduleCount} module${(item.progress?.totalModules || moduleCount) === 1 ? '' : 's'} completed`
                              : `${manualPageCount} written page${manualPageCount === 1 ? '' : 's'} ready to read`}
                          </p>
                          {hasModuleFlow ? (
                            <div className="mt-3 h-2 rounded-full bg-white border border-gray-200 overflow-hidden max-w-xl">
                              <div
                                className="h-full bg-black transition-all"
                                style={{ width: `${item.progress?.percent || 0}%` }}
                              />
                            </div>
                          ) : (
                            <div className="mt-3 inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-500">
                              Written lesson flow
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {hasModuleFlow
                              ? 'Open lessons in order, continue from where you stopped, and mark each module complete after you finish it.'
                              : 'This product uses typed lesson pages in the library. Open the pages below whenever you want to read through the material.'}
                          </p>
                        </div>

                        {item.isCertified && (
                          <div className="lg:text-right">
                            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border ${
                              certificateIssued
                                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                : 'border-amber-100 bg-amber-50 text-amber-700'
                            }`}>
                              {certificateIssued ? <CheckCircle2 size={14} /> : <Award size={14} />}
                              {item.certificateStatus === 'generated'
                                ? (certificateIssued ? 'Certificate issued' : 'Certificate ready')
                                : item.certificateStatus === 'requested'
                                  ? 'Certificate requested'
                                  : item.certificateStatus === 'eligible'
                                    ? 'Certificate eligible'
                                    : 'Certificate in progress'}
                            </div>
                            {certificateIssued && (
                              <p className="text-xs text-gray-500 mt-2 max-w-sm">
                                Check your recipient email to download it, and save a copy to cloud storage for backup.
                              </p>
                            )}
                            {!certificateIssued && item.certificateDescription && (
                              <p className="text-xs text-gray-500 mt-2 max-w-sm">{item.certificateDescription}</p>
                            )}
                            {item.certificateStatus === 'eligible' && (
                              <button
                                onClick={() => openCertificateRequest(item)}
                                disabled={actioning === `${item._id}-certificate`}
                                className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-black text-white text-sm font-bold hover:bg-gray-900 disabled:opacity-60"
                              >
                                {actioning === `${item._id}-certificate` ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />}
                                Request Certificate
                              </button>
                            )}
                            {item.certificateStatus === 'requested' && (
                              <p className="text-xs font-bold text-amber-700 mt-3">
                                Your request has been sent for admin review. Once approved, your finished certificate will be sent to your email as a PDF.
                              </p>
                            )}
                            {item.certificateStatus === 'generated' && certificateIssued && (
                              <p className="text-xs font-bold text-emerald-700 mt-3">
                                Certificate issued successfully. Check your recipient email, then keep a cloud backup after downloading it.
                              </p>
                            )}
                            {item.certificateStatus === 'generated' && item.certificate && (
                              <button
                                onClick={() => generateCertificate(item.certificate)}
                                className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
                              >
                                <Award size={15} />
                                View Certificate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {(supportEmailLink || supportWhatsAppLink) && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 mb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 mb-1">Learner Support</p>
                            <p className="text-sm font-extrabold text-blue-950">Need help with this product while learning on the web?</p>
                            <p className="text-xs text-blue-900/80 leading-relaxed mt-2">
                              Stay inside your digital library for the lessons, then reach out to the trainer or tutor if you need support with a module, task or question.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {supportEmailLink && (
                              <a
                                href={supportEmailLink}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-extrabold text-white hover:bg-gray-900"
                              >
                                <Mail size={15} />
                                Email Trainer
                              </a>
                            )}
                            {supportWhatsAppLink && (
                              <a
                                href={supportWhatsAppLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-900 hover:border-blue-400"
                              >
                                <Phone size={15} />
                                WhatsApp Trainer
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {hasModuleFlow && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-4 mb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00] mb-1">Modules / Series Flow</p>
                            <p className="text-sm font-extrabold text-black">Learn in the order set by the admin</p>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              Read the text lessons, open the media attachments, continue from where you stopped, and mark each module complete when you finish it.
                            </p>
                          </div>
                          <span className="rounded-full bg-[#fcfbf7] px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200">
                            {moduleCount} module{moduleCount === 1 ? '' : 's'} | {lessonItemCount} lesson item{lessonItemCount === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="mb-4 rounded-[24px] border border-amber-100 bg-[#fffdf4] p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a7a00]">Generated Contents Page</p>
                              <p className="mt-2 break-words" style={buildTextPresentationStyle(item?.digitalContentsPage?.titleStyle || {}, DEFAULT_CONTENTS_TITLE_STYLE)}>
                                {item?.digitalContentsPage?.title || 'Table of Contents'}
                              </p>
                              <p className="mt-2 max-w-3xl leading-relaxed break-words" style={buildTextPresentationStyle(item?.digitalContentsPage?.subtitleStyle || {}, DEFAULT_CONTENTS_SUBTITLE_STYLE)}>
                                {item?.digitalContentsPage?.subtitle || 'Choose any module or lesson below to continue from the right place.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openContentsPage(item)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900"
                            >
                              <FileText size={14} />
                              Open Contents Page
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                          {(item.modules || []).map((module, moduleIndex) => {
                            const orderedItems = sortModuleItems(module.items || []);
                            const resumeItem = findLibraryModuleItem(module, module.lastItemId) || orderedItems[0] || null;
                            const completeKey = `${item._id}-${module.moduleId}-complete`;

                            return (
                              <div key={module.moduleId || `module-${moduleIndex}`} className="rounded-[26px] border border-gray-100 bg-[#fcfbf7] p-4">
                                <div className="flex items-start gap-3">
                                  <div className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-black px-2 text-xs font-extrabold text-white shrink-0">
                                    {module.moduleNumber || moduleIndex + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-base font-extrabold text-black">{module.title || `Module ${module.moduleNumber || moduleIndex + 1}`}</p>
                                      {module.completedAt && (
                                        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                          Completed
                                        </span>
                                      )}
                                      {!module.completedAt && module.openedAt && (
                                        <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                          In progress
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                        {orderedItems.length} item{orderedItems.length === 1 ? '' : 's'}
                                      </span>
                                      {module.lastItemTitle && (
                                        <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-amber-700">
                                          Last stop: {module.lastItemTitle}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 space-y-3">
                                  {orderedItems.map((lessonItem, lessonIndex) => {
                                    const inlineKey = `${item._id}-${lessonItem.assetId || lessonItem.itemId}-inline`;
                                    const downloadKey = `${item._id}-${lessonItem.assetId || lessonItem.itemId}-download`;
                                    const textKey = `${item._id}-${lessonItem.itemId}-text`;

                                    return (
                                      <div key={lessonItem.itemId || `${module.moduleId}-${lessonIndex}`} className="rounded-2xl border border-gray-100 bg-white p-4">
                                        <div className="flex items-start gap-3">
                                          <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-black px-1.5 text-xs font-extrabold text-white shrink-0">
                                            {lessonItem.order || lessonIndex + 1}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <p className="text-sm font-extrabold text-black">
                                                {lessonItem.title || (lessonItem.kind === 'file' ? lessonItem.label || 'Attachment' : `Text Lesson ${lessonIndex + 1}`)}
                                              </p>
                                              <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-bold capitalize text-gray-600">
                                                {lessonItem.kind === 'file' ? `${lessonItem.fileKind || 'file'} attachment` : 'text lesson'}
                                              </span>
                                              {lessonItem.isResumeTarget && (
                                                <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                                  Continue here
                                                </span>
                                              )}
                                            </div>
                                            {lessonItem.description && (
                                              <p className="mt-2 text-xs leading-relaxed text-gray-500">{lessonItem.description}</p>
                                            )}
                                            {lessonItem.kind === 'text' && !!lessonItem.blocks?.length && (
                                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                                <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                                  {lessonItem.blocks.length} block{lessonItem.blocks.length === 1 ? '' : 's'}
                                                </span>
                                                {!!lessonItem.blocks.filter((block) => block.kind === 'file').length && (
                                                  <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                                    {lessonItem.blocks.filter((block) => block.kind === 'file').length} attachment{lessonItem.blocks.filter((block) => block.kind === 'file').length === 1 ? '' : 's'}
                                                  </span>
                                                )}
                                                {!!lessonItem.blocks.filter((block) => block.kind === 'link').length && (
                                                  <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                                    {lessonItem.blocks.filter((block) => block.kind === 'link').length} link{lessonItem.blocks.filter((block) => block.kind === 'link').length === 1 ? '' : 's'}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                            {lessonItem.kind === 'text' && lessonItem.savedSentenceText && (
                                              <p className="mt-2 text-xs font-bold text-amber-700">
                                                Saved marker: "{lessonItem.savedSentenceText}"
                                              </p>
                                            )}
                                            {lessonItem.kind === 'file' && (
                                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                                {lessonItem.bytes > 0 && (
                                                  <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                                    {formatBytes(lessonItem.bytes)}
                                                  </span>
                                                )}
                                                <span className={`rounded-full border px-2.5 py-1 ${
                                                  lessonItem.allowDownload
                                                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                                    : 'border-amber-100 bg-amber-50 text-amber-700'
                                                }`}>
                                                  {lessonItem.allowDownload ? 'Download allowed' : 'View only'}
                                                </span>
                                              </div>
                                            )}

                                            <div className="mt-3 flex flex-wrap gap-2">
                                              {lessonItem.kind === 'text' ? (
                                                <button
                                                  type="button"
                                                  onClick={() => openTextLesson(item._id, module.moduleId, lessonItem.itemId)}
                                                  disabled={actioning === textKey}
                                                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900 disabled:opacity-60"
                                                >
                                                  {actioning === textKey ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                                                  {lessonItem.savedSentenceText ? 'Resume Reading' : 'Open Text Lesson'}
                                                </button>
                                              ) : (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => openAsset(
                                                      item._id,
                                                      lessonItem.assetId || lessonItem.itemId,
                                                      lessonItem.canPreview ? 'inline' : (lessonItem.allowDownload ? 'download' : 'inline')
                                                    )}
                                                    disabled={opening === inlineKey || opening === downloadKey}
                                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900 disabled:opacity-60"
                                                  >
                                                    {(opening === inlineKey || opening === downloadKey) ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                                                    {lessonItem.canPreview ? 'Open Attachment' : (lessonItem.allowDownload ? 'Download Attachment' : 'Open Securely')}
                                                  </button>
                                                  {lessonItem.allowDownload && lessonItem.canPreview && (
                                                    <button
                                                      type="button"
                                                      onClick={() => openAsset(item._id, lessonItem.assetId || lessonItem.itemId, 'download')}
                                                      disabled={opening === downloadKey}
                                                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-60"
                                                    >
                                                      {opening === downloadKey ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                                      Download
                                                    </button>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  {resumeItem && (
                                    <button
                                      type="button"
                                      onClick={() => continueModule(item, module)}
                                      disabled={
                                        actioning === `${item._id}-${resumeItem.itemId}-text`
                                        || opening === `${item._id}-${resumeItem.assetId || resumeItem.itemId}-inline`
                                        || opening === `${item._id}-${resumeItem.assetId || resumeItem.itemId}-download`
                                      }
                                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-60"
                                    >
                                      <PlayCircle size={14} />
                                      {module.lastItemId ? 'Continue Module' : 'Start Module'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => markModuleComplete(item._id, module.moduleId)}
                                    disabled={!module.openedAt || !!module.completedAt || actioning === completeKey}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {actioning === completeKey ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    {module.completedAt ? 'Completed' : 'Mark Module Complete'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!hasModuleFlow && !!item.manualPages?.length && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-4 mb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00] mb-1">Written Lesson Pages</p>
                            <p className="text-sm font-extrabold text-black">Structured course notes and typed guidance</p>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              Open each page to read the typed lesson content, workbook notes, or guided steps that came with this digital product.
                            </p>
                          </div>
                          <span className="rounded-full bg-[#fcfbf7] px-3 py-1.5 text-xs font-bold text-gray-600 border border-gray-200">
                            {item.manualPages.length} page{item.manualPages.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          {item.manualPages.map((page, index) => (
                            <div key={page.pageId || `${page.title}-${index}`} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-4">
                              <div className="flex items-start gap-3">
                                <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-black px-1.5 text-xs font-extrabold text-white shrink-0">
                                  {page.pageNumber || index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-bold text-sm text-black">{page.title || `Page ${page.pageNumber || index + 1}`}</p>
                                    {page.attachedMedia && (
                                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-600 capitalize">
                                        {page.attachedMedia.fileKind} attached
                                      </span>
                                    )}
                                  </div>
                                  {page.summary && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{page.summary}</p>}
                                  {!page.summary && page.content && (
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-3">{page.content}</p>
                                  )}
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setManualReader({
                                        ...page,
                                        productId: item.productId,
                                        grantId: item._id,
                                        productName: item.productName,
                                        supportEmail: item.supportEmail || '',
                                        supportWhatsApp: item.supportWhatsApp || '',
                                      })}
                                      className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900"
                                    >
                                      Open Page
                                    </button>
                                    {page.attachedMedia && (
                                      <button
                                        type="button"
                                        onClick={() => openAsset(item._id, page.attachedMedia.assetId, 'inline')}
                                        className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black"
                                      >
                                        Open Attached {page.attachedMedia.fileKind}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!hasModuleFlow && (
                    <div className="grid gap-3">
                      {item.files.map((file) => {
                        const previewKey = `${item._id}-${file.assetId}-inline`;
                        const downloadKey = `${item._id}-${file.assetId}-download`;
                        const completeKey = `${item._id}-${file.moduleId || file.assetId}-complete`;

                        return (
                          <div key={file.assetId} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                  <span className="text-[#FDC700]">{fileIcon(file.fileKind)}</span>
                                  {file.stepNumber && (
                                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-1.5 text-[10px] font-extrabold text-white">
                                      {file.stepNumber}
                                    </span>
                                  )}
                                  <span className="truncate">{file.label || file.originalFilename}</span>
                                </div>
                                {file.stepTitle && file.stepTitle !== file.label && (
                                  <p className="text-xs font-bold text-gray-700 mt-2">{file.stepTitle}</p>
                                )}
                                {file.stepSummary && (
                                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{file.stepSummary}</p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                                  <span className="rounded-full bg-white px-2.5 py-1 border border-gray-200 capitalize">
                                    {file.fileKind}
                                  </span>
                                  {file.bytes > 0 && (
                                    <span className="rounded-full bg-white px-2.5 py-1 border border-gray-200">
                                      {formatBytes(file.bytes)}
                                    </span>
                                  )}
                                  <span className={`rounded-full px-2.5 py-1 border ${
                                    file.allowDownload
                                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                      : 'bg-amber-50 border-amber-100 text-amber-700'
                                  }`}>
                                    {file.allowDownload ? 'Download allowed' : 'View only'}
                                  </span>
                                  {file.openedAt && (
                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 border border-blue-100 text-blue-700">
                                      Opened
                                    </span>
                                  )}
                                  {file.isCompleted && (
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 border border-emerald-100 text-emerald-700">
                                      Completed
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {file.canPreview && (
                                  <button
                                    onClick={() => openAsset(item._id, file.assetId, 'inline')}
                                    disabled={opening === previewKey}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-black text-white text-sm font-bold hover:bg-gray-900 disabled:opacity-60"
                                  >
                                    {opening === previewKey ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
                                    Open Securely
                                  </button>
                                )}
                                {file.allowDownload && (
                                  <button
                                    onClick={() => openAsset(item._id, file.assetId, 'download')}
                                    disabled={opening === downloadKey}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-60"
                                  >
                                    {opening === downloadKey ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                    Download
                                  </button>
                                )}
                                <button
                                  onClick={() => markModuleComplete(item._id, file.moduleId || file.assetId)}
                                  disabled={!file.openedAt || file.isCompleted || actioning === completeKey}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actioning === completeKey ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                  {file.isCompleted ? 'Completed' : 'Mark Complete'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                </div>
              </div>
            );
            })}

            {totalLibraryPages > 1 && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setLibraryPage((current) => Math.max(1, current - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={libraryPage === 1}
                  className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold hover:border-black disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-500">
                  {libraryPage} / {totalLibraryPages}
                </span>
                <button
                  onClick={() => {
                    setLibraryPage((current) => Math.min(totalLibraryPages, current + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={libraryPage === totalLibraryPages}
                  className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold hover:border-black disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {manualReader && (
        <div
          className="fixed inset-0 z-[92] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setManualReader(null)}
        >
          {(() => {
            const manualSupportEmailLink = buildSupportEmailLink(manualReader.supportEmail || '', manualReader.productName || '');
            const manualSupportWhatsAppLink = buildSupportWhatsAppLink(manualReader.supportWhatsApp || '', manualReader.productName || '');
            const isContentsReader = manualReader.readerType === 'table-of-contents';
            const isModuleTextReader = manualReader.readerType === 'module-text';
            return (
              <div
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[30px] border border-gray-100 bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a00]">
                      {isContentsReader ? 'Table of Contents' : (isModuleTextReader ? 'Text Lesson' : 'Lesson Page')}
                    </p>
                    <h3
                      className={`mt-1 break-words ${isContentsReader ? '' : 'text-xl font-extrabold text-black'}`}
                      style={isContentsReader ? buildTextPresentationStyle(manualReader.titleStyle || {}, DEFAULT_CONTENTS_TITLE_STYLE) : undefined}
                    >
                      {manualReader.title || manualReader.productName}
                    </h3>
                    {isContentsReader ? (
                      <>
                        <p
                          className="mt-2 break-words leading-relaxed"
                          style={buildTextPresentationStyle(manualReader.summaryStyle || {}, DEFAULT_CONTENTS_SUBTITLE_STYLE)}
                        >
                          {manualReader.summary}
                        </p>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                          {manualReader.productName}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        {manualReader.productName}
                        {isModuleTextReader && manualReader.moduleTitle ? ` | ${manualReader.moduleTitle}` : ''}
                        {!isModuleTextReader && manualReader.pageNumber ? ` | Page ${manualReader.pageNumber}` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualReader(null)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-black hover:text-black"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="px-5 py-5 space-y-5">
                  {!isContentsReader && manualReader.summary && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed">
                      {manualReader.summary}
                    </div>
                  )}

                  {isContentsReader && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
                      <p className="text-sm font-extrabold text-blue-950">Open the exact lesson you need</p>
                      <p className="mt-2 text-xs leading-relaxed text-blue-900/80">
                        Tap any module title, lesson title, or subtitle below to jump directly into the right module from module 1 to the last module.
                      </p>
                    </div>
                  )}

                  {isModuleTextReader && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
                      <p className="text-sm font-extrabold text-blue-950">Keep your place as you learn</p>
                      <p className="mt-2 text-xs leading-relaxed text-blue-900/80">
                        Tap the sentence where you want to stop. That sentence will stay highlighted so you can continue from that exact point next time.
                      </p>
                      {manualReader.savedSentenceText && (
                        <p className="mt-3 text-xs font-bold text-blue-900">
                          Current marker: "{manualReader.savedSentenceText}"
                        </p>
                      )}
                    </div>
                  )}

                  <div className="rounded-3xl border border-gray-100 bg-[#fcfbf7] px-5 py-5">
                    {isContentsReader ? (
                      <div className="space-y-4">
                        {(manualReader.modules || []).map((module, moduleIndex) => (
                          <div key={module.moduleId || `contents-module-${moduleIndex}`} className="rounded-2xl border border-gray-100 bg-white p-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-3">
                                  <div className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-black px-2 text-xs font-extrabold text-white shrink-0">
                                    {module.moduleNumber || moduleIndex + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setManualReader(null);
                                        window.setTimeout(() => openModuleResumeTarget(manualReader.grantId, module), 0);
                                      }}
                                      className="text-left text-base font-extrabold text-black hover:text-[#9a7a00]"
                                    >
                                      {module.title || `Module ${module.moduleNumber || moduleIndex + 1}`}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setManualReader(null);
                                  window.setTimeout(() => openModuleResumeTarget(manualReader.grantId, module), 0);
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900"
                              >
                                <BookOpen size={14} />
                                {module.lastItemId ? 'Continue Module' : 'Start Module'}
                              </button>
                            </div>

                            {!!module.items?.length && (
                              <div className="mt-4 space-y-3">
                                {(module.items || []).map((lessonItem, lessonIndex) => {
                                  const contentsWritingBlocks = buildContentsWritingBlockEntries(lessonItem);
                                  return (
                                    <div key={lessonItem.itemId || `${module.moduleId || moduleIndex}-lesson-${lessonIndex}`} className="space-y-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setManualReader(null);
                                          window.setTimeout(() => openModuleItem(manualReader.grantId, module.moduleId, lessonItem), 0);
                                        }}
                                        className="w-full rounded-2xl border border-gray-100 bg-[#fcfbf7] px-4 py-3 text-left hover:border-black"
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 text-[11px] font-extrabold text-gray-700 border border-gray-200 shrink-0">
                                            {lessonItem.order || lessonIndex + 1}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <p className="text-sm font-extrabold text-black">
                                                {lessonItem.title || (lessonItem.kind === 'file' ? lessonItem.label || 'Attachment' : `Text Lesson ${lessonIndex + 1}`)}
                                              </p>
                                              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold capitalize text-gray-600">
                                                {lessonItem.kind === 'file' ? `${lessonItem.fileKind || 'file'} attachment` : 'text lesson'}
                                              </span>
                                            </div>
                                            {lessonItem.description && (
                                              <p className="mt-2 text-xs leading-relaxed text-gray-500">{lessonItem.description}</p>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                      {!!contentsWritingBlocks.length && (
                                        <div className="space-y-2 pl-11">
                                          {contentsWritingBlocks.map((blockEntry) => (
                                            <button
                                              key={blockEntry.blockKey}
                                              type="button"
                                              onClick={() => {
                                                setManualReader(null);
                                                window.setTimeout(() => openModuleItem(manualReader.grantId, module.moduleId, lessonItem), 0);
                                              }}
                                              className="w-full rounded-xl border border-gray-100 bg-white px-3 py-2 text-left hover:border-black"
                                            >
                                              <div className="flex flex-wrap items-center gap-2">
                                                {blockEntry.lessonLabel && (
                                                  <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                                                    {blockEntry.lessonLabel}
                                                  </span>
                                                )}
                                                <p className="text-xs font-bold text-gray-700">
                                                  {blockEntry.titleLines[0]}
                                                </p>
                                              </div>
                                              {blockEntry.titleLines.length > 1 && (
                                                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                                                  {blockEntry.titleLines.slice(1).join(' • ')}
                                                </p>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : isModuleTextReader ? (
                      <div className="space-y-4">
                        {manualReader.blocks?.length ? manualReader.blocks.map((block, blockIndex) => {
                          if (block.kind === 'file') {
                            return (
                              <div key={block.blockId || `file-block-${blockIndex}`} className="rounded-2xl border border-gray-100 bg-white p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-extrabold text-black">{block.title || `Attachment ${block.order || blockIndex + 1}`}</p>
                                      <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-bold capitalize text-gray-600">
                                        {block.fileKind}
                                      </span>
                                      {block.bytes > 0 && (
                                        <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-bold text-gray-500">
                                          {formatBytes(block.bytes)}
                                        </span>
                                      )}
                                    </div>
                                    {block.description && <p className="mt-2 text-xs leading-relaxed text-gray-500">{block.description}</p>}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openAsset(manualReader.grantId, block.assetId, block.canPreview ? 'inline' : 'download')}
                                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900"
                                    >
                                      <PlayCircle size={14} />
                                      {block.canPreview ? 'Open Attachment' : 'Download Attachment'}
                                    </button>
                                    {block.allowDownload && block.canPreview && (
                                      <button
                                        type="button"
                                        onClick={() => openAsset(manualReader.grantId, block.assetId, 'download')}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black"
                                      >
                                        <Download size={14} />
                                        Download
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          if (block.kind === 'link') {
                            return (
                              <div key={block.blockId || `link-block-${blockIndex}`} className="rounded-2xl border border-gray-100 bg-white p-4">
                                <p className="text-sm font-extrabold text-black">{block.title || `Link ${block.order || blockIndex + 1}`}</p>
                                {block.description && <p className="mt-2 text-xs leading-relaxed text-gray-500">{block.description}</p>}
                                {block.url && (
                                  <a
                                    href={block.url}
                                    target={block.openInNewTab ? '_blank' : undefined}
                                    rel={block.openInNewTab ? 'noreferrer' : undefined}
                                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-[#fcfbf7] px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black"
                                  >
                                    Open Link
                                  </a>
                                )}
                              </div>
                            );
                          }

                          const sentenceButtonStyle = buildWritingBlockInlineStyle(block.presentation || {}, {
                            includeHighlight: false,
                            includeColor: false,
                            includeWeight: false,
                          });
                          const unsavedSentenceStyle = buildWritingBlockInlineStyle(block.presentation || {}, {
                            includeHighlight: true,
                            includeColor: true,
                            includeWeight: true,
                          });
                          const textFallbackStyle = buildWritingBlockInlineStyle(block.presentation || {});
                          const titleStyle = buildWritingBlockTitleStyle(block.presentation || {});
                          const richTextMarkerKey = `${manualReader.grantId}-${manualReader.itemId}-marker-${block.markerIndex}`;
                          const isSavedRichTextBlock = manualReader.savedSentenceIndex === block.markerIndex;
                          return (
                            <div key={block.blockId || `text-block-${blockIndex}`} className="rounded-2xl border border-gray-100 bg-white p-4">
                              {block.lessonLabel && (
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a7a00]">
                                  {block.lessonLabel}
                                </p>
                              )}
                              {!!block.titleLines?.length && (
                                <div className="space-y-1">
                                  {block.titleLines.map((titleLine, titleLineIndex) => (
                                    <p
                                      key={`${block.blockId || blockIndex}-title-${titleLineIndex}`}
                                      className="break-words font-extrabold"
                                      style={titleStyle}
                                    >
                                      {titleLine}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {block.usesRichText ? (
                                <div className="space-y-3">
                                  <div
                                    className="overflow-hidden rounded-2xl px-3 py-2 leading-relaxed text-gray-700"
                                    style={textFallbackStyle}
                                    dangerouslySetInnerHTML={{ __html: block.contentHtml }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => saveTextMarker(
                                      manualReader.grantId,
                                      manualReader.moduleId,
                                      manualReader.itemId,
                                      block.markerIndex,
                                      block.markerLabel
                                    )}
                                    disabled={actioning === richTextMarkerKey}
                                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition-all ${
                                      isSavedRichTextBlock
                                        ? 'bg-[#FDC700] text-black shadow-sm'
                                        : 'border border-gray-200 bg-[#fcfbf7] text-gray-700 hover:border-black hover:text-black'
                                    } ${actioning === richTextMarkerKey ? 'opacity-60' : ''}`}
                                  >
                                    {actioning === richTextMarkerKey ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : isSavedRichTextBlock ? (
                                      <CheckCircle2 size={14} />
                                    ) : (
                                      <Circle size={14} className="text-gray-300" />
                                    )}
                                    <span>{isSavedRichTextBlock ? 'Continue here next time' : 'Mark this block to continue here'}</span>
                                  </button>
                                </div>
                              ) : block.paragraphs?.length ? block.paragraphs.map((paragraph, paragraphIndex) => (
                                <div key={`${block.blockId || blockIndex}-paragraph-${paragraphIndex}`} className="leading-8 text-gray-700">
                                  {paragraph.map((sentence) => {
                                    const markerKey = `${manualReader.grantId}-${manualReader.itemId}-marker-${sentence.sentenceIndex}`;
                                    const isSavedSentence = manualReader.savedSentenceIndex === sentence.sentenceIndex;
                                    return (
                                      <span key={`${manualReader.itemId}-${sentence.sentenceIndex}`} className="mr-2 mb-2 inline-block align-top">
                                        <button
                                          type="button"
                                          onClick={() => saveTextMarker(
                                            manualReader.grantId,
                                            manualReader.moduleId,
                                            manualReader.itemId,
                                            sentence.sentenceIndex,
                                            sentence.text
                                          )}
                                          disabled={actioning === markerKey}
                                          className={`rounded-2xl px-3 py-2 text-left text-sm leading-7 transition-all ${
                                            isSavedSentence
                                              ? 'bg-[#FDC700] font-bold text-black shadow-sm'
                                              : 'bg-[#fcfbf7] text-gray-700 hover:bg-amber-50'
                                          } ${actioning === markerKey ? 'opacity-60' : ''}`}
                                          style={isSavedSentence ? sentenceButtonStyle : unsavedSentenceStyle}
                                        >
                                          <span className="inline-flex items-start gap-2">
                                            {actioning === markerKey ? (
                                              <Loader2 size={14} className="mt-1 animate-spin shrink-0" />
                                            ) : isSavedSentence ? (
                                              <CheckCircle2 size={14} className="mt-1 shrink-0" />
                                            ) : (
                                              <Circle size={14} className="mt-1 shrink-0 text-gray-300" />
                                            )}
                                            <span>{sentence.text}</span>
                                          </span>
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              )) : (
                                <div className="whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-7 text-gray-700" style={textFallbackStyle}>
                                  {block.content || 'No written content was added to this block yet.'}
                                </div>
                              )}
                            </div>
                          );
                        }) : (
                          <div className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                            {manualReader.content || 'No written content was added to this lesson yet.'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                        {manualReader.content || 'No written content was added to this page yet.'}
                      </div>
                    )}
                  </div>

                    {!isContentsReader && !isModuleTextReader && manualReader.attachedMedia && (
                      <div className="rounded-2xl border border-gray-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400 mb-1">Attached Media</p>
                        <p className="text-sm font-extrabold text-black">{manualReader.attachedMedia.label}</p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">{manualReader.attachedMedia.fileKind}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openAsset(manualReader.grantId, manualReader.attachedMedia.assetId, 'inline')}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-900"
                        >
                          <PlayCircle size={15} />
                          Open Attached {manualReader.attachedMedia.fileKind}
                        </button>
                        {manualReader.attachedMedia.allowDownload && (
                          <button
                            type="button"
                            onClick={() => openAsset(manualReader.grantId, manualReader.attachedMedia.assetId, 'download')}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
                          >
                            <Download size={15} />
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {(manualSupportEmailLink || manualSupportWhatsAppLink) && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
                      <p className="text-sm font-extrabold text-blue-950">
                        {isContentsReader ? 'Need help choosing the right lesson?' : (isModuleTextReader ? 'Need clarification on this lesson?' : 'Need clarification on this page?')}
                      </p>
                      <p className="text-xs text-blue-900/80 leading-relaxed mt-2">
                        {isContentsReader
                          ? 'Contact the trainer or tutor if you need help understanding the module order, lesson titles, or where to continue next.'
                          : 'Contact the trainer or tutor if you need help with this lesson or its attached media.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {manualSupportEmailLink && (
                          <a
                            href={manualSupportEmailLink}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-extrabold text-white hover:bg-gray-900"
                          >
                            <Mail size={15} />
                            Email Trainer
                          </a>
                        )}
                        {manualSupportWhatsAppLink && (
                          <a
                            href={manualSupportWhatsAppLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-900 hover:border-blue-400"
                          >
                            <Phone size={15} />
                            WhatsApp Trainer
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm p-3 sm:p-5"
          onClick={() => setViewer(null)}
        >
          {(() => {
            const viewerSupportEmailLink = buildSupportEmailLink(viewer.supportEmail || '', viewer.productName || '');
            const viewerSupportWhatsAppLink = buildSupportWhatsAppLink(viewer.supportWhatsApp || '', viewer.productName || '');
            return (
          <div
            className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#111111] text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FDC700]">Secure Viewer</p>
                <h3 className="mt-1 text-lg font-extrabold">{viewer.productName}</h3>
                <p className="mt-1 text-xs text-gray-300">
                  {viewer.file.label || viewer.file.originalFilename} {viewer.file.allowDownload ? 'can be downloaded if needed.' : 'is view-only in this library.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-gray-300 hover:border-white hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden bg-black">
              <div className="pointer-events-none absolute inset-0 z-10 opacity-15">
                <div className="grid h-full grid-cols-2 gap-10 p-8 sm:grid-cols-3">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="rotate-[-24deg] text-[10px] font-bold uppercase tracking-[0.24em] text-white/80 sm:text-xs">
                      {viewer.customerName} {viewer.customerEmail ? `• ${viewer.customerEmail}` : ''} • Belle Kreyashon
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-[1] flex h-full items-center justify-center p-3 sm:p-6">
                {viewer.file.fileKind === 'image' ? (
                  <img
                    src={viewer.url}
                    alt={viewer.file.label || viewer.file.originalFilename}
                    className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
                    draggable="false"
                  />
                ) : viewer.file.fileKind === 'video' ? (
                  <video
                    src={viewer.url}
                    className="max-h-full w-full rounded-2xl bg-black shadow-2xl"
                    controls
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                  />
                ) : viewer.file.fileKind === 'audio' ? (
                  <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-white/5 p-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FDC700] text-black">
                      <PlayCircle size={26} />
                    </div>
                    <p className="text-lg font-extrabold">{viewer.file.label || viewer.file.originalFilename}</p>
                    <p className="mt-2 text-sm text-gray-300">Audio stays inside your secure library unless download has been enabled.</p>
                    <audio
                      src={viewer.url}
                      className="mt-6 w-full"
                      controls
                      controlsList="nodownload noremoteplayback"
                    />
                  </div>
                ) : (
                  <iframe
                    src={viewer.url}
                    title={viewer.file.label || viewer.file.originalFilename}
                    className="h-full w-full rounded-2xl bg-white"
                    sandbox="allow-same-origin allow-scripts"
                  />
                )}
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/70 px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-300 leading-relaxed">
                  Keep learning right here in the web library, and if you need help with this lesson or module, contact your trainer or tutor for support.
                </p>
                {(viewerSupportEmailLink || viewerSupportWhatsAppLink) && (
                  <div className="flex flex-wrap gap-2">
                    {viewerSupportEmailLink && (
                      <a
                        href={viewerSupportEmailLink}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-extrabold text-black hover:bg-gray-100"
                      >
                        <Mail size={14} />
                        Email Trainer
                      </a>
                    )}
                    {viewerSupportWhatsAppLink && (
                      <a
                        href={viewerSupportWhatsAppLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-transparent px-3 py-2 text-xs font-bold text-white hover:border-white"
                      >
                        <Phone size={14} />
                        WhatsApp Trainer
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
            );
          })()}
        </div>
      )}

      {certificateTarget && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => {
            if (actioning === `${certificateTarget._id}-certificate`) return;
            setCertificateTarget(null);
            setCertificateFormError('');
          }}
        >
          <div
            className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FDC700]">Certificate Request</p>
                <h3 className="text-xl font-extrabold mt-1">{certificateTarget.productName}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Provide the exact learner details we should use on the certificate and for the final PDF email delivery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (actioning === `${certificateTarget._id}-certificate`) return;
                  setCertificateTarget(null);
                  setCertificateFormError('');
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-black hover:text-black"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                We will send the generated certificate to the email below after admin approval, so please check the spelling carefully.
              </div>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                  <User size={15} className="text-[#FDC700]" />
                  Full name for certificate
                </span>
                <input
                  value={certificateForm.learnerName}
                  onChange={(event) => setCertificateForm((current) => ({ ...current, learnerName: event.target.value }))}
                  placeholder="Enter the full name exactly as it should appear"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Mail size={15} className="text-[#FDC700]" />
                  Certificate email
                </span>
                <input
                  value={certificateForm.learnerEmail}
                  onChange={(event) => setCertificateForm((current) => ({ ...current, learnerEmail: event.target.value }))}
                  placeholder="name@example.com"
                  inputMode="email"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Phone size={15} className="text-[#FDC700]" />
                  Phone or WhatsApp
                </span>
                <input
                  value={certificateForm.learnerPhone}
                  onChange={(event) => setCertificateForm((current) => ({ ...current, learnerPhone: event.target.value }))}
                  placeholder="0241234567 or +233241234567"
                  inputMode="tel"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-black"
                />
              </label>

              <label className="block">
                <span className="mb-2 text-sm font-bold text-gray-700">Note to admin</span>
                <textarea
                  value={certificateForm.notes}
                  onChange={(event) => setCertificateForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional note about spelling, preferred learner name, or certificate details"
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-black resize-none"
                />
              </label>

              {certificateFormError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  {certificateFormError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (actioning === `${certificateTarget._id}-certificate`) return;
                    setCertificateTarget(null);
                    setCertificateFormError('');
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCertificateRequest}
                  disabled={actioning === `${certificateTarget._id}-certificate`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-gray-900 disabled:opacity-60"
                >
                  {actioning === `${certificateTarget._id}-certificate` ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />}
                  Submit Certificate Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSuccess={() => setShowCustomerModal(false)}
        />
      )}
    </div>
  );
}
