import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../hooks/useApi';
import { Plus, Pencil, Trash2, Eye, EyeOff, LogOut, Search, AlertCircle, X, CheckCircle, Circle, FileText, Play, Upload, ImagePlus, Loader2, Award, Mail, Download, MessageCircle, Menu, LayoutGrid, List, Mic, Video, Square, Link2, GripVertical, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { CATEGORY_VALUES } from '../data/categories';
import {
  DIGITAL_TYPE_OPTIONS,
  DIGITAL_DURATION_OPTIONS,
  DIGITAL_FORMAT_OPTIONS,
  DIGITAL_INCLUSION_OPTIONS,
  DIGITAL_SKILL_LEVEL_OPTIONS,
  DIGITAL_TOPIC_OPTIONS,
  getDigitalOptionLabel,
  mergeDigitalOptions,
} from '../data/digitalProductOptions';
import {
  CERTIFICATE_LAYOUT_OPTIONS,
  getCertificateLayoutLabel,
} from '../data/certificateLayouts';
import { FRONTEND_CERTIFICATE_TEMPLATE_PRESETS } from '../data/certificateTemplatePresets';
import { CertificateTemplatePreview } from '../components/CertificateTemplatePicker';
import { generateCertificate } from '../utils/generateCertificate';
import { buildDiscountPresentation } from '../utils/discounts';

const TABS = ['Analytics','Products','Digital Products','Certificates','Training','Delivery','Orders','Bookings','Customers','Abandoned','Consultations','Blog','Featured','Invoice'];
const PRODUCT_LIKE_TABS = new Set(['Products', 'Digital Products', 'Featured']);
const BLOG_LIKE_TABS = new Set(['Blog']);
const WIDE_GRID_TABS = new Set(['Certificates', 'Orders', 'Bookings', 'Customers']);
const ADMIN_ACTIVE_TAB_STORAGE_KEY = 'bk_admin_active_tab';

const getCollectionLayoutClass = (tab, viewMode) => {
  if (viewMode === 'list') return 'flex flex-col gap-3';
  if (PRODUCT_LIKE_TABS.has(tab)) return 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3';
  if (BLOG_LIKE_TABS.has(tab)) return 'grid grid-cols-1 sm:grid-cols-2 gap-3';
  if (WIDE_GRID_TABS.has(tab)) return 'grid grid-cols-1 xl:grid-cols-2 gap-3';
  return 'grid grid-cols-1 lg:grid-cols-2 gap-3';
};

const inp = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black transition-all';
const certHelp = 'mt-1 text-[10px] leading-relaxed text-gray-400';
const DIGITAL_CONTENTS_FONT_OPTIONS = [
  { value:'Georgia, serif', label:'Georgia Serif' },
  { value:'"Times New Roman", serif', label:'Times New Roman' },
  { value:'Arial, sans-serif', label:'Arial Sans' },
  { value:'Verdana, sans-serif', label:'Verdana Sans' },
  { value:'"Trebuchet MS", sans-serif', label:'Trebuchet Sans' },
];
const DIGITAL_CONTENTS_WEIGHT_OPTIONS = [
  { value:'400', label:'Regular' },
  { value:'500', label:'Medium' },
  { value:'600', label:'Semibold' },
  { value:'700', label:'Bold' },
  { value:'800', label:'Extra Bold' },
];
const DIGITAL_CONTENTS_FONT_STYLE_OPTIONS = [
  { value:'normal', label:'Normal' },
  { value:'italic', label:'Italic' },
];
const DIGITAL_CONTENTS_TEXT_TRANSFORM_OPTIONS = [
  { value:'none', label:'Normal Case' },
  { value:'uppercase', label:'UPPERCASE' },
  { value:'capitalize', label:'Capitalize' },
];
const DIGITAL_CONTENTS_TEXT_DECORATION_OPTIONS = [
  { value:'none', label:'No Underline' },
  { value:'underline', label:'Underline' },
];
const DEFAULT_DIGITAL_CONTENTS_TITLE_STYLE = Object.freeze({
  color:'#111827',
  fontSize:32,
  fontFamily:'Georgia, serif',
  fontWeight:'700',
  fontStyle:'normal',
  textTransform:'none',
  textDecoration:'none',
});
const DEFAULT_DIGITAL_CONTENTS_SUBTITLE_STYLE = Object.freeze({
  color:'#4B5563',
  fontSize:16,
  fontFamily:'Arial, sans-serif',
  fontWeight:'500',
  fontStyle:'normal',
  textTransform:'none',
  textDecoration:'none',
});
const DIGITAL_WRITING_BLOCK_LABEL_OPTIONS = [
  { value:'none', label:'No Top Label' },
  { value:'lesson', label:'LESSON Auto Number' },
];
const DIGITAL_WRITING_BLOCK_HIGHLIGHT_OPTIONS = [
  { value:'', label:'No Highlight' },
  { value:'#FEF3C7', label:'Soft Yellow' },
  { value:'#DCFCE7', label:'Fresh Green' },
  { value:'#DBEAFE', label:'Sky Blue' },
  { value:'#FCE7F3', label:'Rose Pink' },
  { value:'#EDE9FE', label:'Lavender' },
];
const MIN_DIGITAL_TEXT_FONT_SIZE = 2;
const DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE = Object.freeze({
  color:'#374151',
  fontSize:11,
  fontFamily:'Arial, sans-serif',
  fontWeight:'400',
  fontStyle:'normal',
  textTransform:'none',
  textDecoration:'none',
});
const createDigitalWritingBlockTitleStyleFallback = (textStyle = DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE) => ({
  color: String(textStyle?.color || DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE.color).trim() || DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE.color,
  fontSize: Math.min(72, Math.max(MIN_DIGITAL_TEXT_FONT_SIZE, (Number(textStyle?.fontSize) || DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE.fontSize) + 3)),
  fontFamily: textStyle?.fontFamily || DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE.fontFamily,
  fontWeight: '600',
  fontStyle: textStyle?.fontStyle === 'italic' ? 'italic' : 'normal',
  textTransform: textStyle?.textTransform || 'none',
  textDecoration: textStyle?.textDecoration === 'underline' ? 'underline' : 'none',
});
const createDigitalWritingBlockSubtitleStyleFallback = (textStyle = DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE) => ({
  color: '#6B7280',
  fontSize: Math.max(MIN_DIGITAL_TEXT_FONT_SIZE, Math.min(48, Number(textStyle?.fontSize) || DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE.fontSize)),
  fontFamily: textStyle?.fontFamily || DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE.fontFamily,
  fontWeight: '500',
  fontStyle: textStyle?.fontStyle === 'italic' ? 'italic' : 'normal',
  textTransform: textStyle?.textTransform || 'none',
  textDecoration: textStyle?.textDecoration === 'underline' ? 'underline' : 'none',
});
const DEFAULT_DIGITAL_WRITING_BLOCK_TITLE_STYLE = Object.freeze(createDigitalWritingBlockTitleStyleFallback());
const DEFAULT_DIGITAL_WRITING_BLOCK_SUBTITLE_STYLE = Object.freeze(createDigitalWritingBlockSubtitleStyleFallback());
const createDefaultDigitalWritingBlockPresentation = () => ({
  labelMode:'none',
  highlightColor:'',
  textStyle:{ ...DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE },
  titleStyle:{ ...DEFAULT_DIGITAL_WRITING_BLOCK_TITLE_STYLE },
  subtitleStyle:{ ...DEFAULT_DIGITAL_WRITING_BLOCK_SUBTITLE_STYLE },
});
const createDefaultDigitalContentsPage = () => ({
  title:'Table of Contents',
  subtitle:'Choose any module or lesson below to continue from the right place.',
  titleStyle:{ ...DEFAULT_DIGITAL_CONTENTS_TITLE_STYLE },
  subtitleStyle:{ ...DEFAULT_DIGITAL_CONTENTS_SUBTITLE_STYLE },
});
const clampContentsFontSize = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(64, Math.max(MIN_DIGITAL_TEXT_FONT_SIZE, Math.round(parsed)));
};
const normalizeDigitalContentsTextStyleForForm = (style = {}, fallback = DEFAULT_DIGITAL_CONTENTS_TITLE_STYLE) => ({
  color: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(style.color || '').trim()) ? String(style.color).trim().toUpperCase() : fallback.color,
  fontSize: clampContentsFontSize(style.fontSize, fallback.fontSize),
  fontFamily: DIGITAL_CONTENTS_FONT_OPTIONS.some((option) => option.value === style.fontFamily) ? style.fontFamily : fallback.fontFamily,
  fontWeight: DIGITAL_CONTENTS_WEIGHT_OPTIONS.some((option) => option.value === String(style.fontWeight || '')) ? String(style.fontWeight) : fallback.fontWeight,
  fontStyle: DIGITAL_CONTENTS_FONT_STYLE_OPTIONS.some((option) => option.value === style.fontStyle) ? style.fontStyle : fallback.fontStyle,
  textTransform: DIGITAL_CONTENTS_TEXT_TRANSFORM_OPTIONS.some((option) => option.value === style.textTransform) ? style.textTransform : fallback.textTransform,
  textDecoration: DIGITAL_CONTENTS_TEXT_DECORATION_OPTIONS.some((option) => option.value === style.textDecoration) ? style.textDecoration : fallback.textDecoration,
});
const normalizeDigitalContentsPageForForm = (page = {}) => ({
  title: String(page.title || '').trim() || 'Table of Contents',
  subtitle: String(page.subtitle || '').trim() || 'Choose any module or lesson below to continue from the right place.',
  titleStyle: normalizeDigitalContentsTextStyleForForm(page.titleStyle || {}, DEFAULT_DIGITAL_CONTENTS_TITLE_STYLE),
  subtitleStyle: normalizeDigitalContentsTextStyleForForm(page.subtitleStyle || {}, DEFAULT_DIGITAL_CONTENTS_SUBTITLE_STYLE),
});
const buildDigitalContentsInlineStyle = (style = {}, fallback = DEFAULT_DIGITAL_CONTENTS_TITLE_STYLE) => {
  const normalized = normalizeDigitalContentsTextStyleForForm(style, fallback);
  return {
    color: normalized.color,
    fontSize: `${normalized.fontSize}px`,
    fontFamily: normalized.fontFamily,
    fontWeight: normalized.fontWeight,
    fontStyle: normalized.fontStyle,
    textTransform: normalized.textTransform,
    textDecoration: normalized.textDecoration,
  };
};
const normalizeDigitalWritingBlockPresentationForForm = (presentation = {}) => {
  const normalizedTextStyle = normalizeDigitalContentsTextStyleForForm(
    presentation.textStyle || {},
    DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE
  );
  return {
    labelMode: DIGITAL_WRITING_BLOCK_LABEL_OPTIONS.some((option) => option.value === presentation.labelMode)
      ? presentation.labelMode
      : 'none',
    highlightColor: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(presentation.highlightColor || '').trim())
      ? String(presentation.highlightColor).trim().toUpperCase()
      : '',
    textStyle: normalizedTextStyle,
    titleStyle: normalizeDigitalContentsTextStyleForForm(
      presentation.titleStyle || {},
      createDigitalWritingBlockTitleStyleFallback(normalizedTextStyle)
    ),
    subtitleStyle: normalizeDigitalContentsTextStyleForForm(
      presentation.subtitleStyle || {},
      createDigitalWritingBlockSubtitleStyleFallback(normalizedTextStyle)
    ),
  };
};
const buildDigitalWritingBlockInlineStyle = (presentation = {}, { includeHighlight = true } = {}) => {
  const normalized = normalizeDigitalWritingBlockPresentationForForm(presentation);
  return {
    ...buildDigitalContentsInlineStyle(normalized.textStyle, DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE),
    ...(includeHighlight && normalized.highlightColor ? { backgroundColor: normalized.highlightColor } : {}),
  };
};
const buildDigitalWritingBlockTitleInlineStyle = (presentation = {}) => {
  const normalized = normalizeDigitalWritingBlockPresentationForForm(presentation);
  return buildDigitalContentsInlineStyle(
    normalized.titleStyle,
    createDigitalWritingBlockTitleStyleFallback(normalized.textStyle)
  );
};
const buildDigitalWritingBlockSubtitleInlineStyle = (presentation = {}) => {
  const normalized = normalizeDigitalWritingBlockPresentationForForm(presentation);
  return buildDigitalContentsInlineStyle(
    normalized.subtitleStyle,
    createDigitalWritingBlockSubtitleStyleFallback(normalized.textStyle)
  );
};
const RICH_TEXT_FONT_SIZE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40, 48];
const RICH_TEXT_ALLOWED_TAGS = new Set(['P', 'DIV', 'BR', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'MARK']);
const RICH_TEXT_STYLE_KEYS = new Set(['color', 'background-color', 'font-family', 'font-size', 'font-style', 'font-weight', 'text-decoration']);
const LEGACY_FONT_SIZE_TO_PX = {
  1: '10px',
  2: '13px',
  3: '16px',
  4: '18px',
  5: '24px',
  6: '32px',
  7: '48px',
};
const escapeRichTextHtml = (value = '') => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const decodeRichTextEntities = (value = '') => {
  if (typeof document === 'undefined') {
    return String(value || '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, '\'');
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = String(value || '');
  return textarea.value;
};
const stripRichTextHtmlToPlainText = (html = '') => decodeRichTextEntities(
  String(html || '')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
).replace(/\r/g, '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .replace(/[ \t]{2,}/g, ' ')
  .trim();
const convertPlainTextToRichTextHtml = (value = '') => {
  const plainText = String(value || '').trim();
  if (!plainText) return '';
  return plainText
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeRichTextHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
};
const sanitizeRichTextStyleValue = (key = '', value = '') => {
  const normalizedKey = String(key || '').trim().toLowerCase();
  const normalizedValue = String(value || '').trim();
  if (!RICH_TEXT_STYLE_KEYS.has(normalizedKey) || !normalizedValue) return '';
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
const sanitizeRichTextHtml = (html = '') => {
  const source = String(html || '').trim();
  if (!source) return '';
  if (typeof DOMParser === 'undefined') return source;

  const parser = new DOMParser();
  const documentRoot = parser.parseFromString(`<div>${source}</div>`, 'text/html');
  const root = documentRoot.body.firstElementChild || documentRoot.body;
  const unwrapElement = (element) => {
    if (!element?.parentNode) return;
    while (element.firstChild) element.parentNode.insertBefore(element.firstChild, element);
    element.remove();
  };
  const convertFontElement = (fontElement) => {
    const span = documentRoot.createElement('span');
    const face = fontElement.getAttribute('face');
    const color = fontElement.getAttribute('color');
    const size = fontElement.getAttribute('size');
    if (face) span.style.fontFamily = face;
    if (color) span.style.color = color;
    if (size && LEGACY_FONT_SIZE_TO_PX[size]) span.style.fontSize = LEGACY_FONT_SIZE_TO_PX[size];
    while (fontElement.firstChild) span.appendChild(fontElement.firstChild);
    fontElement.replaceWith(span);
    return span;
  };
  const sanitizeNode = (node) => {
    if (!node) return;
    if (node.nodeType === 3) return;
    if (node.nodeType !== 1) {
      node.remove();
      return;
    }

    let element = node;
    if (element.tagName === 'FONT') {
      element = convertFontElement(element);
    }

    if (!RICH_TEXT_ALLOWED_TAGS.has(element.tagName)) {
      const childNodes = Array.from(element.childNodes);
      unwrapElement(element);
      childNodes.forEach(sanitizeNode);
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name !== 'style') element.removeAttribute(attribute.name);
    });

    if (element.hasAttribute('style')) {
      const nextStyle = String(element.getAttribute('style') || '')
        .split(';')
        .map((rule) => rule.trim())
        .filter(Boolean)
        .map((rule) => {
          const [rawKey, ...rawValueParts] = rule.split(':');
          const cleanKey = String(rawKey || '').trim().toLowerCase();
          const cleanValue = sanitizeRichTextStyleValue(cleanKey, rawValueParts.join(':'));
          return cleanValue ? `${cleanKey}:${cleanValue}` : '';
        })
        .filter(Boolean)
        .join(';');
      if (nextStyle) {
        element.setAttribute('style', nextStyle);
      } else {
        element.removeAttribute('style');
      }
    }

    Array.from(element.childNodes).forEach(sanitizeNode);
  };

  Array.from(root.childNodes).forEach(sanitizeNode);
  return root.innerHTML.trim();
};
const buildRichTextEditorInitialHtml = (contentHtml = '', plainText = '') => sanitizeRichTextHtml(
  contentHtml || convertPlainTextToRichTextHtml(plainText)
);
const parseDigitalWritingBlockTitleLines = (title = '') => String(title || '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
const resolveDigitalWritingBlockLessonNumber = (blocks = [], blockIndex = 0) => (
  Math.max(
    1,
    (Array.isArray(blocks) ? blocks : [])
      .slice(0, blockIndex + 1)
      .filter((block) => String(block?.kind || '').trim().toLowerCase() === 'text')
      .length
  )
);
const digitalWritingBlockHasVisibleContent = (block = {}) => {
  const normalizedPresentation = normalizeDigitalWritingBlockPresentationForForm(block.presentation || {});
  return !!String(block.content || block.contentHtml || block.title || block.description || '').trim()
    || normalizedPresentation.labelMode === 'lesson';
};

function RichTextEditor({
  value = '',
  plainTextValue = '',
  placeholder = '',
  onChange,
  editorStyle = null,
}) {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const [editorHtml, setEditorHtml] = useState(() => buildRichTextEditorInitialHtml(value, plainTextValue));

  const syncExternalValue = useCallback(() => {
    const nextHtml = buildRichTextEditorInitialHtml(value, plainTextValue);
    setEditorHtml((current) => (current === nextHtml ? current : nextHtml));
    if (editorRef.current && editorRef.current.innerHTML !== nextHtml) {
      editorRef.current.innerHTML = nextHtml;
    }
  }, [plainTextValue, value]);

  useEffect(() => {
    syncExternalValue();
  }, [syncExternalValue]);

  const saveSelection = useCallback(() => {
    if (typeof window === 'undefined') return;
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    selectionRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const editor = editorRef.current;
    const range = selectionRef.current;
    const selection = window.getSelection();
    if (!editor || !range || !selection) return false;
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }, []);

  const emitChange = useCallback((rawHtml = '') => {
    const sanitizedHtml = sanitizeRichTextHtml(rawHtml);
    const plainText = stripRichTextHtmlToPlainText(sanitizedHtml);
    const contentHtml = plainText ? sanitizedHtml : '';
    setEditorHtml(sanitizedHtml);
    if (editorRef.current && editorRef.current.innerHTML !== sanitizedHtml) {
      editorRef.current.innerHTML = sanitizedHtml;
    }
    onChange?.({
      content: plainText,
      contentHtml,
      editorHtml: sanitizedHtml,
    });
  }, [onChange]);

  const syncFromEditor = useCallback(() => {
    if (!editorRef.current) return;
    emitChange(editorRef.current.innerHTML);
    saveSelection();
  }, [emitChange, saveSelection]);

  const replaceLegacyFontTags = useCallback((fontSize = '') => {
    const editor = editorRef.current;
    if (!editor) return;
    Array.from(editor.querySelectorAll('font')).forEach((fontElement) => {
      const span = editor.ownerDocument.createElement('span');
      const face = fontElement.getAttribute('face');
      const color = fontElement.getAttribute('color');
      const size = fontElement.getAttribute('size');
      if (face) span.style.fontFamily = face;
      if (color) span.style.color = color;
      if (fontSize) {
        span.style.fontSize = fontSize;
      } else if (size && LEGACY_FONT_SIZE_TO_PX[size]) {
        span.style.fontSize = LEGACY_FONT_SIZE_TO_PX[size];
      }
      while (fontElement.firstChild) span.appendChild(fontElement.firstChild);
      fontElement.replaceWith(span);
    });
  }, []);

  const runCommand = useCallback((command, commandValue = '') => {
    if (typeof document === 'undefined') return;
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, commandValue);
    syncFromEditor();
  }, [restoreSelection, syncFromEditor]);

  const applyFontSize = useCallback((fontSize) => {
    if (typeof document === 'undefined') return;
    restoreSelection();
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('fontSize', false, '7');
    replaceLegacyFontTags(`${fontSize}px`);
    document.execCommand('styleWithCSS', false, true);
    syncFromEditor();
  }, [replaceLegacyFontTags, restoreSelection, syncFromEditor]);

  const editorIsEmpty = !stripRichTextHtmlToPlainText(editorHtml);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-[#fcfbf7] p-3">
        <span className="rounded-full border border-[#FDC700]/40 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a7a00]">
          Writing Tools
        </span>
        <select
          defaultValue=""
          onMouseDown={saveSelection}
          onChange={(event) => {
            if (!event.target.value) return;
            runCommand('fontName', event.target.value);
            event.target.value = '';
          }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-black"
        >
          <option value="">Font</option>
          {DIGITAL_CONTENTS_FONT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <select
          defaultValue=""
          onMouseDown={saveSelection}
          onChange={(event) => {
            if (!event.target.value) return;
            applyFontSize(Number(event.target.value));
            event.target.value = '';
          }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-black"
        >
          <option value="">Size</option>
          {RICH_TEXT_FONT_SIZE_OPTIONS.map((fontSize) => (
            <option key={fontSize} value={fontSize}>{fontSize}px</option>
          ))}
        </select>

        <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700">
          <span>Text</span>
          <input
            type="color"
            onMouseDown={saveSelection}
            onChange={(event) => runCommand('foreColor', event.target.value.toUpperCase())}
            className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>

        <select
          defaultValue=""
          onMouseDown={saveSelection}
          onChange={(event) => {
            if (!event.target.value) return;
            runCommand('hiliteColor', event.target.value.toUpperCase());
            event.target.value = '';
          }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-black"
        >
          <option value="">Highlight</option>
          {DIGITAL_WRITING_BLOCK_HIGHLIGHT_OPTIONS.filter((option) => option.value).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              runCommand('bold');
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-gray-700 hover:bg-gray-100"
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              runCommand('italic');
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-bold italic text-gray-700 hover:bg-gray-100"
          >
            I
          </button>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              runCommand('underline');
            }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-bold underline text-gray-700 hover:bg-gray-100"
          >
            U
          </button>
        </div>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand('removeFormat');
          }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-black hover:text-black"
        >
          Clear Format
        </button>
      </div>

      <div className="relative">
        {editorIsEmpty && (
          <div className="pointer-events-none absolute left-3 top-3 right-3 whitespace-pre-line text-sm leading-relaxed text-gray-400">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          className="min-h-[180px] w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm leading-relaxed outline-none focus:border-black"
          style={editorStyle || undefined}
        />
      </div>
    </div>
  );
}

function AdminHoverHint({
  text = '',
  align = 'left',
  className = '',
}) {
  const positionClass = align === 'right' ? 'right-0' : 'left-0';
  return (
    <span className={`relative inline-flex shrink-0 group ${className}`}>
      <button
        type="button"
        title={text}
        aria-label="Show help"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:border-gray-300 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200"
      >
        <Info size={12} />
      </button>
      <span
        className={`pointer-events-none absolute ${positionClass} top-full z-30 mt-2 hidden w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] leading-relaxed text-gray-500 shadow-[0_12px_28px_rgba(17,24,39,0.12)] group-hover:block group-focus-within:block sm:w-72`}
      >
        {text}
      </span>
    </span>
  );
}

function WritingBlockTextStyleToolbar({
  label = '',
  value = DEFAULT_DIGITAL_WRITING_BLOCK_TITLE_STYLE,
  onChange,
  onToggleFormat,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={value.fontFamily}
          onChange={(event) => onChange?.('fontFamily', event.target.value)}
          className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 outline-none focus:border-black"
        >
          {DIGITAL_CONTENTS_FONT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">Size</span>
          <input
            value={value.fontSize}
            onChange={(event) => onChange?.('fontSize', Math.min(64, Math.max(MIN_DIGITAL_TEXT_FONT_SIZE, Number(event.target.value) || 16)))}
            type="number"
            min={MIN_DIGITAL_TEXT_FONT_SIZE}
            max="64"
            className="w-16 border-0 bg-transparent p-0 text-[11px] font-bold text-gray-700 outline-none"
          />
        </div>
        <label className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700">
          <span>Color</span>
          <input
            value={value.color}
            onChange={(event) => onChange?.('color', event.target.value.toUpperCase())}
            type="color"
            className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>
        <div className="inline-flex items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => onToggleFormat?.('bold')}
            className={`rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold transition-colors ${
              String(value.fontWeight || '') === '700'
                ? 'bg-black text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => onToggleFormat?.('italic')}
            className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold italic transition-colors ${
              value.fontStyle === 'italic'
                ? 'bg-black text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => onToggleFormat?.('underline')}
            className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold underline transition-colors ${
              value.textDecoration === 'underline'
                ? 'bg-black text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            U
          </button>
        </div>
      </div>
    </div>
  );
}

const convertDrive = (url) => {
  if (!url) return url;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
};

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const normalizeDiscountForForm = (discount = null) => ({
  type: discount?.type === 'fixed' ? 'fixed' : 'percent',
  value: discount?.value ?? '',
  label: discount?.label || '',
  limitCustomers: discount?.limitCustomers ? String(discount.limitCustomers) : '',
  startDate: toDateInput(discount?.startDate),
  endDate: toDateInput(discount?.endDate),
  active: discount?.active !== false,
  usedCount: Number(discount?.usedCount) || 0,
});

const formatAdminDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
};

const formatMoney = (value = 0) => `GHS ${Number(value || 0).toLocaleString()}`;
const pluralize = (value, singular, plural = `${singular}s`) => `${value || 0} ${value === 1 ? singular : plural}`;
const formatCertificateGenerationMode = (value = 'manual', generationChoiceMade = true) => {
  if (generationChoiceMade === false) return 'Choice needed';
  return value === 'template' ? 'Saved template' : 'Manual generator';
};

const isCertificateIssued = (item = {}) => item.emailStatus === 'sent';

const formatCertificateEmailStatus = (item = {}) => {
  if (item.emailStatus === 'sent') {
    return `Issued to learner${item.emailSentAt ? ` on ${formatAdminDate(item.emailSentAt)}` : ''}`;
  }
  if (item.emailStatus === 'failed') {
    return `Email failed${item.emailError ? `: ${item.emailError}` : ''}`;
  }
  return 'Email not sent yet';
};

const normalizeTemplateNameKey = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '');

const resolvePresetTemplateKey = (template = {}) => {
  const explicitPresetKey = String(template.presetKey || '').trim();
  if (explicitPresetKey && FRONTEND_CERTIFICATE_TEMPLATE_PRESETS.some((preset) => preset.presetKey === explicitPresetKey)) {
    return explicitPresetKey;
  }

  const frameStyle = String(template.frameStyle || '').trim();
  const framePreset = FRONTEND_CERTIFICATE_TEMPLATE_PRESETS.find((preset) => preset.frameStyle === frameStyle);
  if (framePreset) return framePreset.presetKey;

  const normalizedName = normalizeTemplateNameKey(template.name || '');
  const namePreset = FRONTEND_CERTIFICATE_TEMPLATE_PRESETS.find(
    (preset) => normalizeTemplateNameKey(preset.name) === normalizedName
  );
  return namePreset?.presetKey || '';
};

const getCertificateTemplateKey = (template = {}) => (
  template.presetKey
  || resolvePresetTemplateKey(template)
  || template._id
  || template.name
  || ''
);

const findCertificateTemplate = (templates = [], identifier = '') => (
  templates.find((template) => (
    template._id === identifier
    || template.presetKey === identifier
    || resolvePresetTemplateKey(template) === identifier
    || template.name === identifier
  )) || null
);

const mergeCertificateTemplates = (templates = []) => {
  const merged = new Map();

  FRONTEND_CERTIFICATE_TEMPLATE_PRESETS.forEach((preset) => {
    merged.set(preset.presetKey, { ...preset });
  });

  templates.forEach((template) => {
    const presetKey = resolvePresetTemplateKey(template);
    if (presetKey && merged.has(presetKey)) {
      merged.set(presetKey, { ...merged.get(presetKey), ...template, presetKey, isPreset: true });
      return;
    }
    merged.set(getCertificateTemplateKey(template), { ...template, presetKey: template.presetKey || '', isPreset: !!template.isPreset });
  });

  return Array.from(merged.values()).sort((a, b) => {
    if (!!a.isPreset !== !!b.isPreset) return a.isPreset ? -1 : 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
};

const normalizeWhatsAppPhone = (value = '') => {
  const cleaned = String(value || '').trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  if (cleaned.startsWith('00')) return cleaned.slice(2);
  if (cleaned.startsWith('0') && cleaned.length === 10) return `233${cleaned.slice(1)}`;
  return cleaned;
};

const buildWhatsAppAdminLink = (phone = '', message = '') => {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return '';
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

const createEmptyCustomDigitalInputs = () => ({
  digitalType: '',
  digitalSkillLevel: '',
  digitalFormat: '',
  digitalDuration: '',
  digitalTopic: '',
  digitalInclusion: '',
});

const createEmptyDigitalManualPage = (pageNumber = 1) => ({
  pageNumber,
  title: '',
  summary: '',
  content: '',
  mediaPublicId: '',
});

const getNextDigitalManualPageNumber = (pages = []) => {
  const currentNumbers = pages
    .map((page) => Number(page?.pageNumber))
    .filter((value) => Number.isFinite(value) && value > 0);
  return currentNumbers.length ? Math.max(...currentNumbers) + 1 : 1;
};

const previewableModuleFileKinds = new Set(['document', 'video', 'audio', 'image']);
const createClientKey = (prefix = 'item') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const isPreviewableModuleFile = (kind = 'other') => previewableModuleFileKinds.has(String(kind || '').trim());
const isImageModuleFile = (kind = 'other') => String(kind || '').trim().toLowerCase() === 'image';
const getModuleUiKey = (module = {}, index = 0) => String(module.clientKey || module._id || `module-${index + 1}`);
const getModuleItemUiKey = (item = {}, moduleKey = 'module', index = 0) => String(item.clientKey || item._id || `${moduleKey}-item-${index + 1}`);
const buildTextLessonContentFromBlocks = (blocks = []) => (
  (Array.isArray(blocks) ? blocks : [])
    .filter((block) => block?.kind === 'text')
    .map((block) => String(block?.content || '').trim() || stripRichTextHtmlToPlainText(block?.contentHtml || ''))
    .filter(Boolean)
    .join('\n\n')
);
const DIGITAL_MODULE_SECTION_DEFAULTS = Object.freeze({
  details: true,
  textComposer: false,
  attachmentComposer: false,
});
const truncatePreviewText = (value = '', maxLength = 220) => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
    : normalized;
};
const formatModuleFileKindLabel = (value = 'other') => {
  const normalized = String(value || 'other').trim().toLowerCase();
  if (!normalized) return 'File';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};
const getDigitalModuleSummary = (module = {}) => {
  const summary = {
    stepCount: 0,
    textStepCount: 0,
    attachmentStepCount: 0,
    textBlockCount: 0,
    linkCount: 0,
    inlineAttachmentCount: 0,
  };

  (Array.isArray(module.items) ? module.items : []).forEach((item) => {
    summary.stepCount += 1;
    if (item?.kind === 'file') {
      summary.attachmentStepCount += 1;
      return;
    }
    summary.textStepCount += 1;
    (Array.isArray(item?.blocks) ? item.blocks : []).forEach((block) => {
      if (block?.kind === 'file') {
        summary.inlineAttachmentCount += 1;
      } else if (block?.kind === 'link') {
        summary.linkCount += 1;
      } else {
        summary.textBlockCount += 1;
      }
    });
  });

  return summary;
};

const createEmptyDigitalModule = (moduleNumber = 1) => ({
  clientKey: createClientKey('module'),
  moduleNumber,
  title: '',
  description: '',
  items: [],
});

const createEmptyDigitalTextBlock = (order = 1) => ({
  clientKey: createClientKey('text-block'),
  blockId: createClientKey('block-id'),
  kind: 'text',
  order,
  title: '',
  description: '',
  presentation: createDefaultDigitalWritingBlockPresentation(),
  content: '',
  contentHtml: '',
});

const createEmptyDigitalLinkBlock = (order = 1) => ({
  clientKey: createClientKey('link-block'),
  blockId: createClientKey('block-id'),
  kind: 'link',
  order,
  title: '',
  description: '',
  url: '',
  openInNewTab: true,
});

const createDigitalFileBlock = (file = {}, order = 1) => ({
  clientKey: createClientKey('file-block'),
  blockId: file.blockId || createClientKey('block-id'),
  _id: file._id,
  kind: 'file',
  order,
  title: file.title || file.label || file.originalFilename || '',
  description: file.description || file.stepSummary || '',
  allowDownload: !!file.allowDownload || !isPreviewableModuleFile(file.fileKind),
  secureUrl: file.secureUrl || '',
  publicId: file.publicId || '',
  originalFilename: file.originalFilename || '',
  downloadName: file.downloadName || file.originalFilename || 'download',
  mimeType: file.mimeType || '',
  resourceType: file.resourceType || 'raw',
  fileKind: file.fileKind || 'other',
  bytes: file.bytes || 0,
  watermarkEnabled: isImageModuleFile(file.fileKind) ? !!file.watermarkEnabled : false,
  watermarkText: isImageModuleFile(file.fileKind) ? String(file.watermarkText || '') : '',
});

const sortTextLessonBlocks = (blocks = []) => [...blocks].sort((a, b) => {
  const orderDiff = Number(a?.order ?? Number.MAX_SAFE_INTEGER) - Number(b?.order ?? Number.MAX_SAFE_INTEGER);
  if (orderDiff !== 0) return orderDiff;
  return String(a?.title || a?.originalFilename || a?.url || '').localeCompare(String(b?.title || b?.originalFilename || b?.url || ''));
});

const reindexTextLessonBlocks = (blocks = []) => sortTextLessonBlocks(blocks).map((block, index) => ({
  ...block,
  order: index + 1,
}));

const buildDigitalContentsWritingBlockEntries = (item = {}) => {
  if (String(item?.kind || '').trim().toLowerCase() !== 'text') return [];
  const blocks = reindexTextLessonBlocks(item.blocks || []);
  return blocks
    .map((block, blockIndex) => {
      if (String(block?.kind || '').trim().toLowerCase() !== 'text') return null;
      const titleLines = parseDigitalWritingBlockTitleLines(block.title || '');
      if (!titleLines.length) return null;
      const lessonLabel = String(block?.presentation?.labelMode || '').trim().toLowerCase() === 'lesson'
        ? `LESSON ${resolveDigitalWritingBlockLessonNumber(blocks, blockIndex)}`
        : '';
      return {
        blockKey: String(block.clientKey || block.blockId || block._id || `contents-block-${blockIndex + 1}`),
        lessonLabel,
        titleLines,
        subtitle: String(block.description || '').trim(),
        presentation: normalizeDigitalWritingBlockPresentationForForm(block.presentation || {}),
      };
    })
    .filter(Boolean);
};

const getDigitalContentsModuleEntryCounts = (module = {}) => {
  const lessons = Array.isArray(module?.items) ? module.items.length : 0;
  const writingBlocks = (Array.isArray(module?.items) ? module.items : []).reduce(
    (sum, item) => sum + buildDigitalContentsWritingBlockEntries(item).length,
    0
  );
  return {
    lessons,
    writingBlocks,
    totalEntries: lessons + writingBlocks,
  };
};

const normalizeTextLessonBlockForForm = (block = {}, index = 0) => {
  if (String(block.kind || '').trim().toLowerCase() === 'file' || block.secureUrl) {
    return {
      ...createDigitalFileBlock(block, Number(block.order) || index + 1),
      _id: block._id,
      blockId: block.blockId || createClientKey('block-id'),
      clientKey: block.clientKey || createClientKey('file-block'),
    };
  }

  if (String(block.kind || '').trim().toLowerCase() === 'link' || block.url) {
    return {
      ...createEmptyDigitalLinkBlock(Number(block.order) || index + 1),
      _id: block._id,
      blockId: block.blockId || createClientKey('block-id'),
      clientKey: block.clientKey || createClientKey('link-block'),
      title: block.title || '',
      description: block.description || '',
      url: block.url || '',
      openInNewTab: block.openInNewTab !== false,
    };
  }

  return {
    ...createEmptyDigitalTextBlock(Number(block.order) || index + 1),
    _id: block._id,
    blockId: block.blockId || createClientKey('block-id'),
    clientKey: block.clientKey || createClientKey('text-block'),
    title: block.title || '',
    description: block.description || '',
    presentation: normalizeDigitalWritingBlockPresentationForForm(block.presentation || {}),
    content: block.content || stripRichTextHtmlToPlainText(block.contentHtml || ''),
    contentHtml: buildRichTextEditorInitialHtml(block.contentHtml || '', block.content || ''),
  };
};

const createEmptyDigitalTextItem = (order = 1) => ({
  clientKey: createClientKey('text'),
  kind: 'text',
  order,
  title: '',
  description: '',
  content: '',
  blocks: [createEmptyDigitalTextBlock(1)],
});

const createDigitalFileItem = (file = {}, order = 1) => ({
  clientKey: createClientKey('file'),
  _id: file._id,
  kind: 'file',
  order,
  title: file.title || file.label || file.originalFilename || '',
  description: file.description || file.stepSummary || '',
  allowDownload: !!file.allowDownload || !isPreviewableModuleFile(file.fileKind),
  secureUrl: file.secureUrl || '',
  publicId: file.publicId || '',
  originalFilename: file.originalFilename || '',
  downloadName: file.downloadName || file.originalFilename || 'download',
  mimeType: file.mimeType || '',
  resourceType: file.resourceType || 'raw',
  fileKind: file.fileKind || 'other',
  bytes: file.bytes || 0,
  watermarkEnabled: isImageModuleFile(file.fileKind) ? !!file.watermarkEnabled : false,
  watermarkText: isImageModuleFile(file.fileKind) ? String(file.watermarkText || '') : '',
  blocks: [],
});

const sortDigitalModuleItems = (items = []) => [...items].sort((a, b) => {
  const orderDiff = Number(a?.order ?? Number.MAX_SAFE_INTEGER) - Number(b?.order ?? Number.MAX_SAFE_INTEGER);
  if (orderDiff !== 0) return orderDiff;
  return String(a?.title || a?.originalFilename || '').localeCompare(String(b?.title || b?.originalFilename || ''));
});

const reindexDigitalModuleItems = (items = []) => sortDigitalModuleItems(items).map((item, index) => ({
  ...item,
  order: index + 1,
  blocks: item.kind === 'text' ? reindexTextLessonBlocks(item.blocks || []) : [],
  content: item.kind === 'text'
    ? (buildTextLessonContentFromBlocks(reindexTextLessonBlocks(item.blocks || [])) || item.content || '')
    : '',
}));

const sortDigitalModulesForForm = (modules = []) => [...modules].sort((a, b) => {
  const moduleDiff = Number(a?.moduleNumber ?? Number.MAX_SAFE_INTEGER) - Number(b?.moduleNumber ?? Number.MAX_SAFE_INTEGER);
  if (moduleDiff !== 0) return moduleDiff;
  return String(a?.title || '').localeCompare(String(b?.title || ''));
});

const reindexDigitalModules = (modules = []) => sortDigitalModulesForForm(modules).map((module, index) => ({
  ...module,
  moduleNumber: index + 1,
  items: reindexDigitalModuleItems(module.items || []),
}));

const normalizeDigitalModuleItemForForm = (item = {}, index = 0) => {
  if (String(item.kind || '').trim().toLowerCase() === 'file' || item.secureUrl) {
    return {
      ...createDigitalFileItem(item, Number(item.order) || index + 1),
      _id: item._id,
      clientKey: item.clientKey || createClientKey('file'),
      title: item.title || item.label || item.originalFilename || '',
      description: item.description || item.stepSummary || '',
    };
  }

  return {
    ...createEmptyDigitalTextItem(Number(item.order) || index + 1),
    _id: item._id,
    clientKey: item.clientKey || createClientKey('text'),
    title: item.title || '',
    description: item.description || item.summary || '',
    blocks: reindexTextLessonBlocks(
      (Array.isArray(item.blocks) && item.blocks.length ? item.blocks : [{ kind: 'text', order: 1, content: item.content || '' }])
        .map((block, blockIndex) => normalizeTextLessonBlockForForm(block, blockIndex))
        .filter((block) => {
          if (block.kind === 'file') return !!block.secureUrl;
          if (block.kind === 'link') return !!String(block.url || block.title || block.description || '').trim();
          return digitalWritingBlockHasVisibleContent(block);
        })
    ),
    content: item.content || buildTextLessonContentFromBlocks(item.blocks || []) || '',
  };
};

const normalizeDigitalModuleForForm = (module = {}, index = 0) => ({
  clientKey: module.clientKey || createClientKey('module'),
  _id: module._id,
  moduleNumber: Number(module.moduleNumber) || index + 1,
  title: module.title || '',
  description: module.description || '',
  items: reindexDigitalModuleItems((module.items || []).map((item, itemIndex) => normalizeDigitalModuleItemForForm(item, itemIndex))),
});

const buildLegacyDigitalModulesForForm = (item = {}) => {
  const files = [...(item.digitalFiles || [])]
    .filter((file) => file?.secureUrl)
    .sort((a, b) => {
      const orderDiff = Number(a?.stepNumber ?? Number.MAX_SAFE_INTEGER) - Number(b?.stepNumber ?? Number.MAX_SAFE_INTEGER);
      if (orderDiff !== 0) return orderDiff;
      return String(a?.label || a?.originalFilename || '').localeCompare(String(b?.label || b?.originalFilename || ''));
    });
  const filesByPublicId = new Map(files.filter((file) => file?.publicId).map((file) => [String(file.publicId), file]));
  const usedPublicIds = new Set();
  const modules = [];

  [...(item.digitalManualPages || [])]
    .sort((a, b) => {
      const orderDiff = Number(a?.pageNumber ?? Number.MAX_SAFE_INTEGER) - Number(b?.pageNumber ?? Number.MAX_SAFE_INTEGER);
      if (orderDiff !== 0) return orderDiff;
      return String(a?.title || '').localeCompare(String(b?.title || ''));
    })
    .forEach((page, index) => {
      const linkedFile = filesByPublicId.get(String(page.mediaPublicId || '')) || null;
      if (linkedFile?.publicId) usedPublicIds.add(String(linkedFile.publicId));
      const module = {
        _id: page._id,
        clientKey: createClientKey('module'),
        moduleNumber: Number(page.pageNumber) || modules.length + 1,
        title: page.title || `Module ${index + 1}`,
        description: page.summary || '',
        items: [
          normalizeDigitalModuleItemForForm({
            _id: page._id,
            kind: 'text',
            order: 1,
            title: page.title || '',
            description: page.summary || '',
            content: page.content || '',
          }, 0),
          ...(linkedFile ? [normalizeDigitalModuleItemForForm({
            ...linkedFile,
            kind: 'file',
            order: 2,
            title: linkedFile.stepTitle || linkedFile.label || linkedFile.originalFilename || '',
            description: linkedFile.stepSummary || '',
          }, 1)] : []),
        ],
      };
      modules.push(module);
    });

  files
    .filter((file) => !file?.publicId || !usedPublicIds.has(String(file.publicId)))
    .forEach((file) => {
      modules.push({
        _id: file._id,
        clientKey: createClientKey('module'),
        moduleNumber: Number(file.stepNumber) || modules.length + 1,
        title: file.stepTitle || file.label || file.originalFilename || `Module ${modules.length + 1}`,
        description: file.stepSummary || '',
        items: [normalizeDigitalModuleItemForForm({
          ...file,
          kind: 'file',
          order: 1,
          title: file.stepTitle || file.label || file.originalFilename || '',
          description: file.stepSummary || '',
        }, 0)],
      });
    });

  return reindexDigitalModules(modules);
};

const collectDistinctValues = (values = []) => (
  [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
);

const collectDistinctFieldValues = (items = [], key = '') => (
  collectDistinctValues(items.map((item) => item?.[key]))
);

const collectDistinctListValues = (items = [], key = '') => (
  collectDistinctValues(items.flatMap((item) => Array.isArray(item?.[key]) ? item[key] : []))
);

const CertificateTemplateDropdown = ({
  templates = [],
  selectedId = '',
  appliedId = '',
  onSelectId,
  onPreview,
  onApply,
  applyLabel = 'Use This Template',
  emptyMessage = 'No certificate templates yet.',
  selectLabel = 'Select template',
}) => {
  if (!templates.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-4 text-xs text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  const selectedTemplate = findCertificateTemplate(templates, selectedId) || templates[0] || null;
  const selectedKey = selectedTemplate ? getCertificateTemplateKey(selectedTemplate) : '';
  const applied = !!selectedKey && selectedKey === appliedId;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-3 py-3 sm:px-4 sm:py-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px] lg:grid-cols-[minmax(0,1fr)_165px] sm:items-start">
        <div className="space-y-3 min-w-0">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
              {selectLabel}
            </label>
            <select
              value={selectedKey}
              onChange={(event) => onSelectId?.(event.target.value)}
              className={`${inp} mt-1.5`}
            >
              {templates.map((template) => {
                const templateKey = getCertificateTemplateKey(template);
                return (
                  <option key={templateKey} value={templateKey}>
                    {template.name}{template.isPreset ? ' (Preset)' : ' (Saved)'}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedTemplate && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                  selectedTemplate.isPreset ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedTemplate.isPreset ? 'Preset' : 'Saved'}
                </span>
                {applied && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-green-700">
                    <CheckCircle size={11} />
                    Applied
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-extrabold text-gray-900 truncate">{selectedTemplate.name}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  {getCertificateLayoutLabel(selectedTemplate.frameStyle || 'classic')}
                </p>
                <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">
                  {selectedTemplate.certificateTitle || selectedTemplate.productName || 'Certificate'}
                  {selectedTemplate.organizerName ? ` | ${selectedTemplate.organizerName}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {onPreview && (
                  <button
                    type="button"
                    onClick={() => onPreview(selectedTemplate)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                  >
                    <Eye size={12} />
                    Preview
                  </button>
                )}
                {onApply && (
                  <button
                    type="button"
                    onClick={() => onApply(selectedTemplate)}
                    className={`inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold ${
                      applied
                        ? 'border border-green-200 bg-green-50 text-green-700'
                        : 'bg-black text-white hover:bg-gray-900'
                    }`}
                  >
                    {applied ? 'Applied' : applyLabel}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {selectedTemplate && (
          <div className="mx-auto w-full max-w-[130px] sm:max-w-[150px] lg:max-w-[165px]">
            <CertificateTemplatePreview template={selectedTemplate} compact />
          </div>
        )}
      </div>
    </div>
  );
};

const EMPTY_PROD = { name:'',desc:'',category:'',images:[],retailPrice:'',wholesalePrice:'',wholesaleMinQty:'',stock:'',isPreOrder:false,preOrderType:'',depositPercent:'',available:true,featured:false,fastSelling:false,hasDiscount:false,discount:{type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:''},isPartner:false,partnerBrand:'',partnerContact:'' };
const EMPTY_DIGITAL = {
  name:'', desc:'', category:'Digital Products', images:[], retailPrice:'', available:true, featured:false, fastSelling:false,
  hasDiscount:false, discount:{type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:''},
  isDigital:true, digitalType:'mixed', accessNote:'', digitalModules:[], digitalManualPages:[], digitalFiles:[],
  supportEmail:'', supportWhatsApp:'',
  digitalContentsPage:createDefaultDigitalContentsPage(),
  digitalSkillLevel:'all-levels', digitalFormat:'', digitalDuration:'', digitalTopics:[], digitalInclusions:[],
  digitalAccessKind:'paid', freeTrialDays:'7', isSeries:false, seriesTitle:'', seriesDescription:'',
  isCertified:false, certificateTitle:'', certificateDescription:'',
};
const EMPTY_CERT = {
  type:'manual', status:'generated', digitalAccess:'', productId:'', productName:'', customerId:'',
  generationMode:'manual', generationChoiceMade:true, templateId:'', templateName:'', presetKey:'', templatePickerOpen:false, templateCandidateId:'',
  learnerName:'', learnerEmail:'', learnerPhone:'', requestedAt:toDateInput(new Date()), requestNotes:'',
  completionSnapshot:{ totalModules:0, completedModules:0, percent:0 },
  certificateTitle:'', certificateSubtitle:'', certificateBody:'', issueDate:toDateInput(new Date()),
  primaryColor:'#111827', accentColor:'#FDC700', backgroundColor:'#FFFDF7', fontColor:'#374151', fontFamily:'classic_serif', frameStyle:'classic',
  organizerName:'Belle Kreyashon', sponsors:'', signatoryOneName:'', signatoryOneRole:'', signatoryTwoName:'', signatoryTwoRole:'',
  notes:'', emailStatus:'unsent', emailSentAt:'', emailError:'',
};

const inferCertificateGenerationChoice = (item = {}) => {
  if (typeof item.generationChoiceMade === 'boolean') return item.generationChoiceMade;
  if (item.type !== 'digital_request') return true;
  if (item.status !== 'pending') return true;
  return !!item.templateId;
};

const mapCertificateRecordToForm = (item = {}, fallbackTemplateId = '') => {
  const signatories = item.signatories || [];
  const generationChoiceMade = inferCertificateGenerationChoice(item);
  const generationMode = item.generationMode || (item.templateId ? 'template' : 'manual');

  return {
    ...EMPTY_CERT,
    ...item,
    generationMode,
    generationChoiceMade,
    templateId: item.templateId || '',
    templateName: item.templateName || '',
    presetKey: item.presetKey || '',
    templatePickerOpen: generationMode === 'template',
    templateCandidateId: item.templateId || fallbackTemplateId || '',
    sponsors: item.sponsors?.join(', ') || '',
    requestedAt: toDateInput(item.requestedAt),
    issueDate: toDateInput(item.issueDate || item.generatedAt),
    primaryColor: item.primaryColor || '#111827',
    accentColor: item.accentColor || '#FDC700',
    backgroundColor: item.backgroundColor || '#FFFDF7',
    fontColor: item.fontColor || '#374151',
    fontFamily: item.fontFamily || 'classic_serif',
    frameStyle: item.frameStyle || 'classic',
    signatoryOneName: signatories[0]?.name || '',
    signatoryOneRole: signatories[0]?.role || '',
    signatoryTwoName: signatories[1]?.name || '',
    signatoryTwoRole: signatories[1]?.role || '',
  };
};

const applyCertificateTemplateToForm = (current, template) => {
  if (!template) return current;
  const signatories = template.signatories || [];

  return {
    ...current,
    generationMode: 'template',
    templateId: template._id || '',
    templateName: template.name || '',
    presetKey: template.presetKey || '',
    certificateTitle: template.certificateTitle || current.certificateTitle || current.productName || '',
    certificateSubtitle: template.certificateSubtitle || current.certificateSubtitle || '',
    certificateBody: template.certificateBody || current.certificateBody || '',
    primaryColor: template.primaryColor || current.primaryColor || '#111827',
    accentColor: template.accentColor || current.accentColor || '#FDC700',
    backgroundColor: template.backgroundColor || current.backgroundColor || '#FFFDF7',
    fontColor: template.fontColor || current.fontColor || '#374151',
    fontFamily: template.fontFamily || current.fontFamily || 'classic_serif',
    frameStyle: template.frameStyle || current.frameStyle || 'classic',
    organizerName: template.organizerName || current.organizerName || '',
    sponsors: Array.isArray(template.sponsors) ? template.sponsors.join(', ') : (current.sponsors || ''),
    signatoryOneName: signatories[0]?.name || '',
    signatoryOneRole: signatories[0]?.role || '',
    signatoryTwoName: signatories[1]?.name || '',
    signatoryTwoRole: signatories[1]?.role || '',
  };
};
const EMPTY_TRAIN = { title:'',desc:'',date:'',venue:'',price:'',capacity:'',image:'',partners:'',sponsors:'',active:true };
const EMPTY_ZONE  = { name:'', fee:'' };
const EMPTY_CONSULT = { title:'',desc:'',price:'',duration:'',validity:'',isFree:false };
const EMPTY_BLOG = { title:'',excerpt:'',content:'',coverImage:'',videoUrl:'',mediaType:'image',tags:'',published:false };
const EMPTY_FEATURED = { brandName:'',productName:'',desc:'',images:[],contactInfo:'',plan:1,category:'',price:'',stock:'',available:true,featured:true,fastSelling:false,isPreOrder:false,preOrderType:'',depositPercent:'',hasDiscount:false,discount:{type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:''},isPartner:true,partnerContact:'' };

const PLANS = [1,3,6,9,12];
const CERTIFICATE_FONTS = [
  { value:'classic_serif', label:'Classic Serif' },
  { value:'formal_serif', label:'Formal Serif' },
  { value:'modern_sans', label:'Modern Sans' },
  { value:'executive_sans', label:'Executive Sans' },
];
const TAB_FORM_LABELS = {
  Analytics: 'Analytics',
  Products: 'Product',
  'Digital Products': 'Digital Product',
  Certificates: 'Certificate',
  Training: 'Training',
  Delivery: 'Delivery',
  Orders: 'Order',
  Bookings: 'Booking',
  Customers: 'Customer',
  Abandoned: 'Abandoned',
  Consultations: 'Consultation',
  Blog: 'Blog Post',
  Featured: 'Featured Product',
  Invoice: 'Invoice',
};

// ─── IMAGE UPLOADER COMPONENT ─────────────────────────────────────────────────
// Compresses images client-side before uploading to Cloudinary
// Max 3 images, shows previews, allows removal
const compressImageFile = (file, max = 1200) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > max || height > max) {
        if (width > height) { height = Math.round(height * max / width); width = max; }
        else                { width = Math.round(width * max / height); height = max; }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', 0.82);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

function ImageUploader({ images = [], onChange, uploadEndpoint, token, maxImages = 3 }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const fileRef                   = useRef();

  const handleFiles = async (files) => {
    setError('');
    const remaining = maxImages - images.length;
    if (remaining <= 0) { setError(`Max ${maxImages} images allowed`); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of toUpload) {
        const compressed = await compressImageFile(file);
        formData.append('images', compressed);
      }
      const { data } = await api.post(uploadEndpoint, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      onChange([...images, ...data.urls]);
    } catch (e) {
      setError(e.response?.data?.message || 'Upload failed. Try again.');
    }
    setUploading(false);
  };

  const remove = (idx) => onChange(images.filter((_, i) => i !== idx));

  const onDrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };

  return (
    <div className="sm:col-span-2 space-y-2">
      {/* Previews */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <X size={10} />
              </button>
              {i === 0 && <span className="absolute bottom-0 left-0 right-0 text-center text-white text-[9px] font-bold bg-black/50 py-0.5">Main</span>}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone — only show if under limit */}
      {images.length < maxImages && (
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-black transition-all">
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" /> Uploading & compressing...
            </div>
          ) : (
            <div className="text-gray-400">
              <ImagePlus size={22} className="mx-auto mb-1" />
              <p className="text-xs font-bold">Click or drag images here</p>
              <p className="text-xs text-gray-300 mt-0.5">{images.length}/{maxImages} • JPG, PNG, WebP • Max 5MB each • Auto-compressed</p>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}

function TrainingImageUploader({ image = '', onChange, uploadEndpoint, token }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      const compressed = await compressImageFile(file);
      formData.append('image', compressed);
      const { data } = await api.post(uploadEndpoint, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      onChange(data.url);
    } catch (e) {
      setError(e.response?.data?.message || 'Upload failed. Try again.');
    }
    setUploading(false);
  };

  return (
    <div className="sm:col-span-2 space-y-2">
      <div
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-black transition-all"
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" /> Uploading & compressing...
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="text-gray-400">
              <p className="text-xs font-bold">Upload local training image</p>
              <p className="text-xs text-gray-300 mt-0.5">JPG, PNG, WebP • Max 5MB • Auto-compressed before upload</p>
            </div>
            <div className="shrink-0 text-gray-400">
              <Upload size={18} />
            </div>
          </div>
        )}
      </div>

      {image && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-2">
          <img src={image} alt="" className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-600">Current image</p>
            <p className="text-xs text-gray-400 truncate">{image}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}


// ─── INVOICE CREATOR ──────────────────────────────────────────────────────────
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

const isPreviewableDigitalFile = (fileKind = 'other') => ['document', 'video', 'audio', 'image'].includes(fileKind);

function DigitalFileUploader({ files = [], onChange, uploadEndpoint, token, maxFiles = 8 }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFiles = async (selectedFiles) => {
    setError('');
    const remaining = maxFiles - files.length;
    if (remaining <= 0) {
      setError(`Max ${maxFiles} files allowed`);
      return;
    }

    const nextFiles = Array.from(selectedFiles || []).slice(0, remaining);
    if (!nextFiles.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      nextFiles.forEach(file => formData.append('files', file));
      const { data } = await api.post(uploadEndpoint, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      onChange([...(files || []), ...(data.files || [])]);
    } catch (e) {
      setError(e.response?.data?.message || 'Upload failed. Try again.');
    }
    setUploading(false);
  };

  const remove = (idx) => onChange(files.filter((_, index) => index !== idx));
  const updateLabel = (idx, label) => onChange(files.map((file, index) => index === idx ? { ...file, label } : file));
  const updateField = (idx, key, value) => onChange(files.map((file, index) => index === idx ? { ...file, [key]: value } : file));

  return (
    <div className="sm:col-span-2 space-y-3">
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, idx) => {
            const previewable = isPreviewableDigitalFile(file.fileKind);
            const allowDownload = !!file.allowDownload || !previewable;

            return (
              <div key={`${file.publicId || file.originalFilename}-${idx}`} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                    {file.fileKind === 'video' ? <Play size={16} /> : <FileText size={16} />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <input value={file.label || ''} onChange={e => updateLabel(idx, e.target.value)} placeholder="File label" className={inp} />
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input
                        value={file.stepNumber ?? ''}
                        onChange={e => updateField(idx, 'stepNumber', e.target.value)}
                        placeholder="Module / day number"
                        type="number"
                        className={inp}
                      />
                      <input
                        value={file.stepTitle || ''}
                        onChange={e => updateField(idx, 'stepTitle', e.target.value)}
                        placeholder="Module / step title"
                        className={inp}
                      />
                    </div>
                    <textarea
                      value={file.stepSummary || ''}
                      onChange={e => updateField(idx, 'stepSummary', e.target.value)}
                      placeholder="What this module covers"
                      rows={2}
                      className={inp + ' resize-none'}
                    />
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-600">
                      <input
                        type="checkbox"
                        checked={allowDownload}
                        onChange={e => updateField(idx, 'allowDownload', e.target.checked)}
                        disabled={!previewable}
                        className="w-4 h-4 accent-black"
                      />
                      {previewable ? 'Allow learner download' : 'Download required for this file type'}
                    </label>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                      <span>{file.originalFilename || 'Digital file'}</span>
                      {file.fileKind && <span className="capitalize">{file.fileKind}</span>}
                      {file.bytes > 0 && <span>{formatBytes(file.bytes)}</span>}
                      <span>{allowDownload ? 'Download enabled' : 'View only in library'}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => remove(idx)}
                    className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 shrink-0">
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {files.length < maxFiles && (
        <div
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-black transition-all"
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" /> Uploading secure files...
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="text-gray-400">
                <p className="text-xs font-bold">Upload digital files securely</p>
                <p className="text-xs text-gray-300 mt-0.5">PDF, DOC, ZIP, MP4, MP3 and more. Upload one file per module, lesson, day or bundle part.</p>
              </div>
              <Upload size={18} className="text-gray-400 shrink-0" />
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}

function DigitalMediaRecorder({ files = [], onChange, uploadEndpoint, token, maxFiles = 8 }) {
  const [recordMode, setRecordMode] = useState('audio');
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const clearPreview = useCallback(() => {
    setRecordedBlob(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
  }, []);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopTracks();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl, stopTracks]);

  const pickMimeType = (mode) => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    const candidates = mode === 'video'
      ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const getRecordingExtension = (mimeType = '', mode = 'audio') => {
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
    return mode === 'video' ? 'webm' : 'webm';
  };

  const startRecording = async (mode) => {
    if (files.length >= maxFiles) {
      setError(`Max ${maxFiles} files allowed`);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser does not support direct audio or video recording here.');
      return;
    }

    setError('');
    clearPreview();
    stopTracks();
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        mode === 'video'
          ? { audio: true, video: { facingMode: 'user' } }
          : { audio: true, video: false }
      );

      streamRef.current = stream;
      const mimeType = pickMimeType(mode);
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      setRecordMode(mode);
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError('Recording failed. Please try again.');
        setRecording(false);
        stopTracks();
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || (mode === 'video' ? 'video/webm' : 'audio/webm'),
        });
        if (blob.size > 0) {
          setRecordedBlob(blob);
          setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return URL.createObjectURL(blob);
          });
        }
        recorderRef.current = null;
        setRecording(false);
        stopTracks();
      };

      recorder.start();
      setRecording(true);
    } catch (recordError) {
      stopTracks();
      setRecording(false);
      setError(
        recordError?.name === 'NotAllowedError'
          ? 'Microphone or camera access was blocked. Allow access and try again.'
          : recordError?.message || 'Could not start recording right now.'
      );
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return;
    recorderRef.current.stop();
  };

  const uploadRecording = async () => {
    if (!recordedBlob) return;
    if (files.length >= maxFiles) {
      setError(`Max ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    setError('');
    try {
      const extension = getRecordingExtension(recordedBlob.type, recordMode);
      const fallbackType = recordMode === 'video' ? 'video/webm' : 'audio/webm';
      const file = new File(
        [recordedBlob],
        `recorded-${recordMode}-${Date.now()}.${extension}`,
        { type: recordedBlob.type || fallbackType }
      );
      const formData = new FormData();
      formData.append('files', file);
      const { data } = await api.post(uploadEndpoint, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      onChange([...(files || []), ...(data.files || [])]);
      clearPreview();
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'Could not upload the recorded media right now.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="sm:col-span-2 space-y-3 rounded-2xl border border-gray-200 bg-[#fcfbf7] p-4">
      <div className="flex flex-wrap items-start gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Record Media</p>
          <p className="mt-1 text-[10px] leading-relaxed text-gray-400">Quick audio or video capture.</p>
        </div>
        <AdminHoverHint
          text="Record a quick audio lesson, voice note, walkthrough, or video clip here, then upload it straight into this digital product as a secure media file."
          className="mt-0.5"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => startRecording('audio')}
          disabled={recording || uploading || files.length >= maxFiles}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900 disabled:opacity-50"
        >
          <Mic size={14} />
          Record Audio
        </button>
        <button
          type="button"
          onClick={() => startRecording('video')}
          disabled={recording || uploading || files.length >= maxFiles}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-50"
        >
          <Video size={14} />
          Record Video
        </button>
        {recording && (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:border-red-300"
          >
            <Square size={13} />
            Stop Recording
          </button>
        )}
      </div>

      {recording && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
          Recording {recordMode === 'video' ? 'video' : 'audio'} now. Press stop when the lesson clip is ready.
        </div>
      )}

      {previewUrl && recordedBlob && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-black">Recorded {recordMode === 'video' ? 'video' : 'audio'} ready</p>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-400">Preview before uploading.</p>
            </div>
            <span className="rounded-full bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-bold text-gray-600 border border-gray-200">
              {formatBytes(recordedBlob.size)}
            </span>
          </div>

          {recordMode === 'video' ? (
            <video src={previewUrl} controls className="w-full rounded-2xl border border-gray-200 bg-black" />
          ) : (
            <audio src={previewUrl} controls className="w-full" />
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={uploadRecording}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FDC700] px-4 py-2.5 text-xs font-bold text-black hover:bg-yellow-300 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Upload Recording
            </button>
            <button
              type="button"
              onClick={clearPreview}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-50"
            >
              <X size={14} />
              Discard
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs font-bold text-red-500">{error}</p>}
    </div>
  );
}

function ModuleAssetUploader({ token, uploadEndpoint, disabled = false, onUploaded, variant = 'card', buttonLabel = 'Add upload attachment' }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (fileList) => {
    if (!fileList?.length || disabled) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      Array.from(fileList).forEach((file) => formData.append('files', file));
      const { data } = await api.post(uploadEndpoint, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      onUploaded?.(data.files || []);
      if (fileRef.current) fileRef.current.value = '';
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'Could not upload module files right now.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {variant === 'inline' ? (
        <button
          type="button"
          onClick={() => !disabled && !uploading && fileRef.current?.click()}
          disabled={disabled || uploading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Uploading...' : buttonLabel}
        </button>
      ) : (
        <div
          onDrop={(event) => {
            event.preventDefault();
            handleFiles(event.dataTransfer.files);
          }}
          onDragOver={(event) => event.preventDefault()}
          onClick={() => !disabled && fileRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-4 transition-all ${
            disabled ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300' : 'cursor-pointer border-gray-200 bg-white hover:border-black'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              Uploading lesson files...
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-xs font-bold text-black">Add upload attachment</p>
                  <AdminHoverHint
                    text="Upload images, video, audio, PDFs, slides, workbooks, ZIPs, or other secure lesson attachments straight into this module."
                    className="sm:hidden"
                  />
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-gray-400">Secure lesson files.</p>
              </div>
              <div className="flex items-center gap-2">
                <AdminHoverHint
                  text="Upload images, video, audio, PDFs, slides, workbooks, ZIPs, or other secure lesson attachments straight into this module."
                  align="right"
                  className="hidden sm:inline-flex"
                />
                <Upload size={16} className="shrink-0 text-gray-400" />
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs font-bold text-red-500">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}

function ModuleMediaRecorder({ token, uploadEndpoint, disabled = false, onRecorded, variant = 'card' }) {
  const [recordMode, setRecordMode] = useState('audio');
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [capturedName, setCapturedName] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const captureInputRef = useRef(null);

  const clearPreview = useCallback(() => {
    setRecordedBlob(null);
    setCapturedName('');
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
  }, []);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopTracks();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl, stopTracks]);

  const pickMimeType = (mode) => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
    const candidates = mode === 'video'
      ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const getRecordingExtension = (mimeType = '', mode = 'audio') => {
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('gif')) return 'gif';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
    if (mode === 'image') return 'jpg';
    return mode === 'video' ? 'webm' : 'webm';
  };

  const startRecording = async (mode) => {
    if (disabled) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser does not support direct audio or video recording here.');
      return;
    }

    setError('');
    clearPreview();
    stopTracks();
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        mode === 'video'
          ? { audio: true, video: { facingMode: 'user' } }
          : { audio: true, video: false }
      );
      streamRef.current = stream;
      const mimeType = pickMimeType(mode);
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorderRef.current = recorder;
      setRecordMode(mode);
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError('Recording failed. Please try again.');
        setRecording(false);
        stopTracks();
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || (mode === 'video' ? 'video/webm' : 'audio/webm'),
        });
        if (blob.size > 0) {
          setRecordedBlob(blob);
          setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return URL.createObjectURL(blob);
          });
        }
        recorderRef.current = null;
        setRecording(false);
        stopTracks();
      };

      recorder.start();
      setRecording(true);
    } catch (recordError) {
      stopTracks();
      setRecording(false);
      setError(
        recordError?.name === 'NotAllowedError'
          ? 'Microphone or camera access was blocked. Allow access and try again.'
          : recordError?.message || 'Could not start recording right now.'
      );
    }
  };

  const handleCapturedImage = (files) => {
    const imageFile = files?.[0];
    if (!imageFile || disabled) return;
    setError('');
    setRecordMode('image');
    setRecording(false);
    stopTracks();
    setRecordedBlob(imageFile);
    setCapturedName(imageFile.name || `module-image-${Date.now()}`);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(imageFile);
    });
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return;
    recorderRef.current.stop();
  };

  const uploadRecording = async () => {
    if (!recordedBlob || disabled) return;
    setUploading(true);
    setError('');
    try {
      const extension = getRecordingExtension(recordedBlob.type, recordMode);
      const fallbackType = recordMode === 'video'
        ? 'video/webm'
        : recordMode === 'image'
          ? 'image/jpeg'
          : 'audio/webm';
      const file = recordedBlob instanceof File
        ? new File(
          [recordedBlob],
          recordedBlob.name || capturedName || `module-${recordMode}-${Date.now()}.${extension}`,
          { type: recordedBlob.type || fallbackType }
        )
        : new File(
          [recordedBlob],
          `module-${recordMode}-${Date.now()}.${extension}`,
          { type: recordedBlob.type || fallbackType }
        );
      const formData = new FormData();
      formData.append('files', file);
      const { data } = await api.post(uploadEndpoint, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      onRecorded?.(data.files || []);
      clearPreview();
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || 'Could not upload the recorded media right now.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={variant === 'inline' ? 'space-y-2' : 'space-y-2 rounded-2xl border border-gray-200 bg-white p-4'}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => startRecording('audio')}
          disabled={disabled || recording || uploading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900 disabled:opacity-50"
        >
          <Mic size={14} />
          Record Audio
        </button>
        <button
          type="button"
          onClick={() => startRecording('video')}
          disabled={disabled || recording || uploading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-50"
        >
          <Video size={14} />
          Record Video
        </button>
        <button
          type="button"
          onClick={() => captureInputRef.current?.click()}
          disabled={disabled || recording || uploading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-50"
        >
          <ImagePlus size={14} />
          Capture Picture
        </button>
        {recording && (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:border-red-300"
          >
            <Square size={13} />
            Stop
          </button>
        )}
      </div>

      {recording && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
          Recording {recordMode === 'video' ? 'video' : 'audio'} now. Stop when this lesson clip is ready.
        </div>
      )}

      {previewUrl && recordedBlob && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-[#fcfbf7] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-black">
                {recordMode === 'image'
                  ? 'Captured picture ready'
                  : `Recorded ${recordMode === 'video' ? 'video' : 'audio'} ready`}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
                Preview before adding.
              </p>
            </div>
            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-600">
              {formatBytes(recordedBlob.size)}
            </span>
          </div>

          {recordMode === 'video' ? (
            <video src={previewUrl} controls className="w-full rounded-2xl border border-gray-200 bg-black" />
          ) : recordMode === 'image' ? (
            <img src={previewUrl} alt={capturedName || 'Captured attachment'} className="w-full rounded-2xl border border-gray-200 bg-white object-contain max-h-80" />
          ) : (
            <audio src={previewUrl} controls className="w-full" />
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={uploadRecording}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FDC700] px-4 py-2.5 text-xs font-bold text-black hover:bg-yellow-300 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {recordMode === 'image' ? 'Add Picture' : 'Add Recording'}
            </button>
            <button
              type="button"
              onClick={clearPreview}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-50"
            >
              <X size={14} />
              Discard
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs font-bold text-red-500">{error}</p>}
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          handleCapturedImage(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function DigitalProductCustomerPreview({
  productName = '',
  accessNote = '',
  modules = [],
  expandedModules = {},
  onToggleModule,
  onExpandAll,
  onCollapseAll,
}) {
  const orderedModules = reindexDigitalModules(Array.isArray(modules) ? modules : []);

  return (
    <div className="rounded-[28px] border border-black/10 bg-[radial-gradient(circle_at_top,_rgba(253,199,0,0.18),_transparent_55%),linear-gradient(180deg,_#fffef8_0%,_#f6f2e8_100%)] p-4 sm:p-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a00]">Customer View Preview</p>
          <h4 className="mt-1 text-lg font-extrabold text-black">
            {productName || 'Untitled digital product'}
          </h4>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-600">
            {truncatePreviewText(
              accessNote || 'This mirrors the module-by-module learning flow learners will see after purchase, using the current draft order from this form.',
              240
            )}
          </p>
        </div>
        {!!orderedModules.length && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExpandAll}
              className="rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
            >
              Expand Preview
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              className="rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
            >
              Collapse Preview
            </button>
          </div>
        )}
      </div>

      {!orderedModules.length ? (
        <div className="rounded-2xl border border-dashed border-white/80 bg-white/75 px-4 py-4 text-[10px] leading-relaxed text-gray-400">
          Add at least one module to see the learner preview here.
        </div>
      ) : (
        <div className="space-y-3">
          {orderedModules.map((module, moduleIndex) => {
            const moduleKey = getModuleUiKey(module, moduleIndex);
            const isExpanded = expandedModules[moduleKey] ?? moduleIndex === 0;
            const moduleSummary = getDigitalModuleSummary(module);

            return (
              <div
                key={moduleKey}
                className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_12px_30px_rgba(17,24,39,0.06)]"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                      Module {module.moduleNumber || moduleIndex + 1}
                    </div>
                    <h5 className="mt-2 text-base font-extrabold text-black">
                      {module.title || `Untitled Module ${module.moduleNumber || moduleIndex + 1}`}
                    </h5>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                      {truncatePreviewText(
                        module.description || 'Learners will see the lesson steps you place inside this module in the same order shown here.',
                        240
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-gray-600">
                      <span className="rounded-full border border-[#eadfbd] bg-[#fff8df] px-2.5 py-1">
                        {pluralize(moduleSummary.stepCount, 'step')}
                      </span>
                      <span className="rounded-full border border-[#eadfbd] bg-[#fff8df] px-2.5 py-1">
                        {pluralize(moduleSummary.textStepCount, 'text lesson')}
                      </span>
                      <span className="rounded-full border border-[#eadfbd] bg-[#fff8df] px-2.5 py-1">
                        {pluralize(moduleSummary.attachmentStepCount + moduleSummary.inlineAttachmentCount, 'media attachment')}
                      </span>
                      {!!moduleSummary.linkCount && (
                        <span className="rounded-full border border-[#eadfbd] bg-[#fff8df] px-2.5 py-1">
                          {pluralize(moduleSummary.linkCount, 'link')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleModule(moduleKey)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Hide Preview' : 'Open Preview'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3">
                    {(module.items || []).map((item, itemIndex) => {
                      const itemBlocks = item.kind === 'text' ? reindexTextLessonBlocks(item.blocks || []) : [];
                      const attachmentBlocks = itemBlocks.filter((block) => block.kind === 'file');
                      const linkBlocks = itemBlocks.filter((block) => block.kind === 'link');

                      return (
                        <div key={item.clientKey || item._id || `${moduleKey}-${itemIndex}`} className="rounded-2xl border border-[#f0ead7] bg-[#fffdf7] p-4">
                          <div className="flex items-start gap-3">
                            <div className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-black px-2 text-xs font-extrabold text-white">
                              {item.order || itemIndex + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-extrabold text-black">
                                  {item.title || (item.kind === 'file' ? item.originalFilename || `Attachment Step ${item.order || itemIndex + 1}` : `Lesson Step ${item.order || itemIndex + 1}`)}
                                </p>
                                <span className="rounded-full border border-[#ece2c5] bg-white px-2.5 py-1 text-[11px] font-bold capitalize text-gray-600">
                                  {item.kind === 'file' ? `${formatModuleFileKindLabel(item.fileKind)} step` : 'Text lesson'}
                                </span>
                              </div>
                              {!!item.description && (
                                <p className="mt-1 text-xs leading-relaxed text-gray-600">{item.description}</p>
                              )}

                              {item.kind === 'file' ? (
                                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-gray-600">
                                  {item.originalFilename && (
                                    <span className="rounded-full border border-[#ece2c5] bg-white px-2.5 py-1">
                                      {item.originalFilename}
                                    </span>
                                  )}
                                  {item.fileKind && (
                                    <span className="rounded-full border border-[#ece2c5] bg-white px-2.5 py-1">
                                      {formatModuleFileKindLabel(item.fileKind)}
                                    </span>
                                  )}
                                  {item.bytes > 0 && (
                                    <span className="rounded-full border border-[#ece2c5] bg-white px-2.5 py-1">
                                      {formatBytes(item.bytes)}
                                    </span>
                                  )}
                                  <span className={`rounded-full border px-2.5 py-1 ${
                                    item.allowDownload
                                      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                      : 'border-amber-100 bg-amber-50 text-amber-700'
                                  }`}>
                                    {item.allowDownload ? 'Download enabled' : 'View in library'}
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-gray-600">
                                    <span className="rounded-full border border-[#ece2c5] bg-white px-2.5 py-1">
                                      {pluralize(itemBlocks.length, 'block')}
                                    </span>
                                    {!!attachmentBlocks.length && (
                                      <span className="rounded-full border border-[#ece2c5] bg-white px-2.5 py-1">
                                        {pluralize(attachmentBlocks.length, 'inline attachment')}
                                      </span>
                                    )}
                                    {!!linkBlocks.length && (
                                      <span className="rounded-full border border-[#ece2c5] bg-white px-2.5 py-1">
                                        {pluralize(linkBlocks.length, 'link')}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-3 space-y-2.5">
                                    {itemBlocks.map((block, blockIndex) => (
                                      <div key={block.clientKey || block._id || `${moduleKey}-${itemIndex}-${blockIndex}`} className="rounded-2xl border border-[#f3ecdd] bg-white px-4 py-3">
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9a7a00]">
                                          {block.kind === 'file' ? (
                                            <>
                                              {block.fileKind === 'video' ? <Video size={13} /> : block.fileKind === 'audio' ? <Mic size={13} /> : block.fileKind === 'image' ? <ImagePlus size={13} /> : <Upload size={13} />}
                                              {formatModuleFileKindLabel(block.fileKind)} Attachment
                                            </>
                                          ) : block.kind === 'link' ? (
                                            <>
                                              <Link2 size={13} />
                                              Link
                                            </>
                                          ) : (
                                            <>
                                              <FileText size={13} />
                                              Writing
                                            </>
                                          )}
                                        </div>

                                        {block.kind === 'text' ? (
                                          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                                            {truncatePreviewText(block.content || 'Written instruction will appear here once text is added.', 320)}
                                          </p>
                                        ) : block.kind === 'link' ? (
                                          <div className="mt-2 space-y-1">
                                            <p className="text-sm font-bold text-black">
                                              {block.title || 'Helpful reference link'}
                                            </p>
                                            {block.description && (
                                              <p className="text-xs leading-relaxed text-gray-600">{block.description}</p>
                                            )}
                                            <p className="text-xs text-gray-500 break-all">{block.url || 'Link URL pending'}</p>
                                          </div>
                                        ) : (
                                          <div className="mt-2 space-y-2">
                                            <p className="text-sm font-bold text-black">
                                              {block.title || block.originalFilename || `${formatModuleFileKindLabel(block.fileKind)} attachment`}
                                            </p>
                                            {block.description && (
                                              <p className="text-xs leading-relaxed text-gray-600">{block.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-2 text-[11px] font-bold text-gray-600">
                                              {block.originalFilename && (
                                                <span className="rounded-full border border-[#ece2c5] bg-[#fcfbf7] px-2.5 py-1">
                                                  {block.originalFilename}
                                                </span>
                                              )}
                                              {block.bytes > 0 && (
                                                <span className="rounded-full border border-[#ece2c5] bg-[#fcfbf7] px-2.5 py-1">
                                                  {formatBytes(block.bytes)}
                                                </span>
                                              )}
                                              <span className={`rounded-full border px-2.5 py-1 ${
                                                block.allowDownload
                                                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                                  : 'border-amber-100 bg-amber-50 text-amber-700'
                                              }`}>
                                                {block.allowDownload ? 'Download enabled' : 'View in library'}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-xs leading-relaxed text-gray-600">
        This preview follows the exact draft order from the editor. Purchased learners will also get progress tracking, resume markers, and protected file access inside their digital library.
      </div>
    </div>
  );
}

function InvoiceCreator({ auth }) {
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddr,  setCustomerAddr]  = useState('');
  const [items,         setItems]         = useState([{ desc: '', qty: 1, price: '' }]);
  const [note,          setNote]          = useState('');
  const [products,      setProducts]      = useState([]);
  const inp2 = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black transition-all';

  useEffect(() => {
    api.get('/api/products', auth).then(r => setProducts(r.data)).catch(() => {});
  }, [auth]);

  const addItem    = () => setItems(p => [...p, { desc: '', qty: 1, price: '' }]);
  const removeItem = (i) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => setItems(p => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  const pickProduct = (i, productId) => {
    const p = products.find(x => x._id === productId);
    if (p) updateItem(i, 'desc', p.name);
    if (p) updateItem(i, 'price', p.retailPrice);
  };

  const subtotal = items.reduce((s, i) => s + (Number(i.price) * Number(i.qty) || 0), 0);

  const printInvoice = () => {
    if (!customerName.trim()) return alert('Please enter customer name');
    if (items.some(i => !i.desc.trim() || !i.price)) return alert('Please fill all item details');
    const date  = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const refId = 'INV-' + new Date().getTime().toString().slice(-6);
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px">${item.desc}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center">${item.qty}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right">GHS ${Number(item.price).toLocaleString()}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:bold">GHS ${(Number(item.price)*Number(item.qty)).toLocaleString()}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Invoice ${refId}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#222;background:#fff;padding:40px;max-width:700px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
.brand{font-size:22px;font-weight:900}.brand span{color:#FDC700}
.inv{text-align:right}.inv h2{font-size:28px;font-weight:900;letter-spacing:2px}.inv p{font-size:13px;color:#666;margin-top:4px}
hr.gold{border:none;border-top:3px solid #FDC700;margin:16px 0}
hr.dark{border:none;border-top:2px solid #000;margin:20px 0}
.info{display:flex;justify-content:space-between;margin-bottom:28px}
.ib p{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.ib h4{font-size:14px;font-weight:bold}.ib span{font-size:13px;color:#444;display:block;line-height:1.6}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#000;color:#fff;padding:10px 8px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;text-align:left}
th:nth-child(2){text-align:center}th:nth-child(3),th:nth-child(4){text-align:right}
.totals{margin-left:auto;width:260px}
.totals td{padding:6px 8px;font-size:13px}.totals td:last-child{text-align:right;font-weight:bold}
.total-row td{border-top:2px solid #000;font-size:15px;font-weight:900;padding-top:10px}
.note{background:#f9f9f9;border-left:3px solid #FDC700;padding:10px 14px;font-size:12px;color:#555;margin-top:16px}
.footer{margin-top:36px;text-align:center;color:#aaa;font-size:11px;border-top:1px solid #eee;padding-top:16px}
</style></head><body>
<div class="header">
  <div class="brand">BELLE <span>KREYASHON</span></div>
  <div class="inv"><h2>INVOICE</h2><p>${refId}</p><p>${date}</p></div>
</div>
<hr class="gold"/>
<div class="info">
  <div class="ib"><p>Billed To</p><h4>${customerName}</h4><span>${customerPhone}</span>${customerAddr ? `<span>${customerAddr}</span>` : ''}</div>
  <div class="ib" style="text-align:right"><p>From</p><h4>Belle Kreyashon</h4><span>Osu, Accra, Ghana</span><span>bellekreyashon.com</span></div>
</div>
<table>
  <thead><tr><th>Item / Service</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${itemsHtml}</tbody>
</table>
<table class="totals">
  <tr class="total-row"><td>Total</td><td>GHS ${subtotal.toLocaleString()}</td></tr>
</table>
${note ? `<div class="note">${note}</div>` : ''}
<hr class="dark"/>
<div class="footer">
  <p>Thank you for choosing Belle Kreyashon</p>
  <p style="margin-top:4px">Questions? WhatsApp us or visit bellekreyashon.com</p>
  <p style="margin-top:8px;color:#ccc">In-person sales invoice — issued by Belle Kreyashon team.</p>
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;
    window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
  };

  return (
    <div className="col-span-3 bg-white rounded-2xl p-6 border border-gray-100 max-w-2xl">
      <h2 className="font-extrabold text-lg mb-1">Invoice Creator</h2>
      <p className="text-xs text-gray-400 mb-5">Create invoice/receipt for in-person or custom sales</p>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <input value={customerName}  onChange={e => setCustomerName(e.target.value)}  placeholder="Customer name *"    className={inp2} />
        <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Phone number"       className={inp2} />
        <input value={customerAddr}  onChange={e => setCustomerAddr(e.target.value)}  placeholder="Address (optional)" className={inp2 + ' sm:col-span-2'} />
      </div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Items / Services</p>
      <div className="flex flex-col gap-2 mb-3">
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
              <select onChange={e => pickProduct(i, e.target.value)} className={inp2 + ' mb-1'}>
                <option value="">Pick from products...</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.name} — GHS {p.retailPrice}</option>)}
              </select>
              <input value={item.desc} onChange={e => updateItem(i,'desc',e.target.value)} placeholder="Or type description *" className={inp2} />
            </div>
            <div className="col-span-2">
              <input value={item.qty}   onChange={e => updateItem(i,'qty',e.target.value)}   type="number" min="1" placeholder="Qty"        className={inp2} />
            </div>
            <div className="col-span-3">
              <input value={item.price} onChange={e => updateItem(i,'price',e.target.value)} type="number"        placeholder="Price (GHS)" className={inp2} />
            </div>
            <div className="col-span-1 text-right">
              <span className="text-xs font-bold text-gray-500">{item.price && item.qty ? 'GHS ' + (Number(item.price)*Number(item.qty)).toLocaleString() : ''}</span>
            </div>
            <div className="col-span-1 text-right">
              {items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>}
            </div>
          </div>
        ))}
      </div>
      <button onClick={addItem} className="text-xs font-bold text-gray-400 hover:text-black mb-4">+ Add Item</button>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional — e.g. paid cash, balance due, etc.)" rows={2}
        className={inp2 + ' resize-none mb-4'} />
      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl mb-4">
        <span className="font-bold text-sm text-gray-600">Total</span>
        <span className="font-extrabold text-xl">GHS {subtotal.toLocaleString()}</span>
      </div>
      <button onClick={printInvoice}
        className="w-full py-3.5 bg-black text-white font-extrabold rounded-2xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2">
        🖨️ Generate & Print Invoice
      </button>
    </div>
  );
}


// ─── MAIN ADMIN COMPONENT ─────────────────────────────────────────────────────
export default function Admin() {
  const [token,   setToken]   = useState(() => localStorage.getItem('bk_admin') || '');
  const [setup,   setSetup]   = useState(null);
  const [pin,     setPin]     = useState('');
  const [newPin,  setNewPin]  = useState('');
  const [mPin,    setMPin]    = useState('');
  const [reset,   setReset]   = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [sessionMsg, setSessionMsg] = useState('');
  const [tab,     setTab]     = useState(() => {
    const savedTab = localStorage.getItem(ADMIN_ACTIVE_TAB_STORAGE_KEY) || '';
    return TABS.includes(savedTab) ? savedTab : 'Products';
  });
  const [search,  setSearch]  = useState('');
  const [customCat, setCustomCat] = useState('');
  const [savedCategories, setSavedCategories] = useState([]);
  const [customDigitalInputs, setCustomDigitalInputs] = useState(createEmptyCustomDigitalInputs());

  const [data,    setData]    = useState([]);
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 20;
  const [certificateTemplates, setCertificateTemplates] = useState([]);
  const [bulkTemplateId, setBulkTemplateId] = useState('');
  const [bulkLearners, setBulkLearners] = useState('');
  const [certificateBusy, setCertificateBusy] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState({});
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [digitalAutoSave, setDigitalAutoSave] = useState({ status: 'idle', message: '' });
  const [expandedDigitalModules, setExpandedDigitalModules] = useState({});
  const [expandedDigitalModuleSections, setExpandedDigitalModuleSections] = useState({});
  const [expandedDigitalModuleItems, setExpandedDigitalModuleItems] = useState({});
  const [expandedDigitalWritingBlocks, setExpandedDigitalWritingBlocks] = useState({});
  const [visibleDigitalWritingBlockTitles, setVisibleDigitalWritingBlockTitles] = useState({});
  const [showDigitalCustomerPreview, setShowDigitalCustomerPreview] = useState(false);
  const [expandedPreviewModules, setExpandedPreviewModules] = useState({});
  const [showDigitalContentsPreviewEntries, setShowDigitalContentsPreviewEntries] = useState(true);
  const [expandedDigitalContentsPreviewModules, setExpandedDigitalContentsPreviewModules] = useState({});
  const draggedModuleRef = useRef(null);
  const draggedModuleItemRef = useRef(null);
  const draggedLessonBlockRef = useRef(null);
  const digitalModulesSectionRef = useRef(null);
  const latestAdminLoadRef = useRef(0);
  const digitalAutoSaveTimerRef = useRef(null);
  const digitalDraftTimerRef = useRef(null);
  const lastDigitalAutoSaveSnapshotRef = useRef('');
  const pendingDigitalItemScrollRef = useRef('');
  const DIGITAL_DRAFT_STORAGE_KEY = 'bk-admin-digital-product-draft-v2';

  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const visibleCertificateTemplates = mergeCertificateTemplates(certificateTemplates);
  const digitalContentsPagePreview = normalizeDigitalContentsPageForForm(form.digitalContentsPage || {});
  const digitalDiscountPreview = buildDiscountPresentation(form.retailPrice, { ...(form.discount || {}), active: true }, { respectLiveState: false });
  const [orderFilter,    setOrderFilter]    = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');

  const downloadCSV = (data, filename) => {
    if (!data.length) return;
    const keys   = ['orderId','createdAt','customer.name','customer.phone','customer.address','fulfillment','deliveryZone','subtotal','deliveryFee','total','status','paymentRef'];
    const header = ['Order ID','Date','Customer Name','Phone','Address','Fulfillment','Zone','Subtotal','Delivery','Total','Status','Payment Ref'];
    const rows   = data.map(o => keys.map(k => {
      const val = k.includes('.') ? k.split('.').reduce((obj,key) => obj?.[key], o) : o[k];
      if (k === 'createdAt') return new Date(val).toLocaleDateString('en-GB');
      return val ?? '';
    }));
    const csv  = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    api.get('/api/auth/status').then(r => setSetup(r.data.setup)).catch(() => {});
  }, []);

  const loadSavedCategories = useCallback(async () => {
    try {
      const { data: categories } = await api.get('/api/products/categories');
      setSavedCategories(Array.isArray(categories) ? categories : []);
    } catch {
      setSavedCategories([]);
    }
  }, []);

  useEffect(() => {
    loadSavedCategories();
  }, [loadSavedCategories]);

  const expireSession = useCallback((message = 'Your admin session expired. Please log in again.') => {
    localStorage.removeItem('bk_admin');
    setToken('');
    setData([]);
    setShowForm(false);
    setEditId(null);
    setSessionMsg(message);
  }, []);

  const login = async () => {
    setAuthErr('');
    setSessionMsg('');
    try {
      const { data } = await api.post(setup ? '/api/auth/login' : '/api/auth/setup', { pin });
      localStorage.setItem('bk_admin', data.token);
      setToken(data.token); setSetup(true);
    } catch (e) { setAuthErr(e.response?.data?.message || 'Failed'); }
  };

  const resetPin = async () => {
    setAuthErr('');
    setSessionMsg('');
    try {
      const { data } = await api.post('/api/auth/reset', { masterPin: mPin, newPin });
      localStorage.setItem('bk_admin', data.token);
      setToken(data.token); setReset(false);
    } catch (e) { setAuthErr(e.response?.data?.message || 'Failed'); }
  };

  const logout = () => {
    localStorage.removeItem('bk_admin');
    setToken('');
    setSessionMsg('');
  };

  const ENDPOINTS = {
    Analytics: '/api/orders/analytics',
    Products: '/api/products', 'Digital Products': '/api/products', Certificates: '/api/certificates', Training: '/api/training',
    Delivery: '/api/delivery', Orders: '/api/orders',
    Customers: '/api/customers',
    Abandoned: '/api/orders/abandoned', Consultations: '/api/consultation',
    Blog: '/api/blog', Featured: '/api/products', Bookings: '/api/training/bookings',
  };

  const load = useCallback(async (t, s) => {
    if (!token) return;
    const requestId = latestAdminLoadRef.current + 1;
    latestAdminLoadRef.current = requestId;
    setLoading(true);
    setData([]);
    let ep = ENDPOINTS[t];
    if (t !== 'Analytics') setSalesAnalytics(null);
    if (t === 'Featured') ep = '/api/products?isPartner=true';
    if (t === 'Products') ep = '/api/products?isDigital=false';
    if (t === 'Digital Products') ep = '/api/products?isDigital=true';
    const q = s ? `${ep.includes('?') ? '&' : '?'}search=${encodeURIComponent(s)}` : '';
    try {
      if (t === 'Analytics') {
        const { data: analytics } = await api.get(ep, auth);
        if (latestAdminLoadRef.current !== requestId) return;
        setSalesAnalytics(analytics);
        setLoading(false);
        return;
      }
      const requests = [api.get(ep + q, auth)];
      if (t === 'Certificates') requests.push(api.get('/api/certificates/templates', auth));
      const [r, templatesResponse] = await Promise.all(requests);
      if (latestAdminLoadRef.current !== requestId) return;
      const items = Array.isArray(r.data) ? r.data : [];
      if (t === 'Digital Products') {
        setData(items.filter(item => item?.isDigital || item?.category === 'Digital Products'));
      } else if (t === 'Products') {
        setData(items.filter(item => !item?.isDigital));
      } else {
        setData(items);
      }
      if (t === 'Certificates') {
        const templates = Array.isArray(templatesResponse?.data) ? templatesResponse.data : [];
        setCertificateTemplates(templates);
        setBulkTemplateId(current => current || getCertificateTemplateKey(templates[0]) || '');
      }
    } catch (e) {
      if (e.response?.status === 401) {
        expireSession(
          e.response?.data?.message === 'Invalid token'
            ? 'Your admin login expired on this device. Please log in again.'
            : 'Please log in again to continue.'
        );
        return;
      }
      if (latestAdminLoadRef.current !== requestId) return;
      setData([]);
      if (t === 'Analytics') setSalesAnalytics(null);
      if (t === 'Certificates') setCertificateTemplates([]);
    }
    if (latestAdminLoadRef.current !== requestId) return;
    setLoading(false);
  }, [expireSession, token]);

  useEffect(() => {
    load(tab, '');
    setSearch('');
    setShowForm(false);
    setEditId(null);
    setPage(1);
    setDigitalAutoSave({ status: 'idle', message: '' });
    setExpandedDigitalModules({});
    setExpandedDigitalModuleSections({});
    setExpandedDigitalModuleItems({});
    setExpandedDigitalWritingBlocks({});
    setExpandedPreviewModules({});
    setExpandedDigitalContentsPreviewModules({});
    setShowDigitalCustomerPreview(false);
    setShowDigitalContentsPreviewEntries(true);
    pendingDigitalItemScrollRef.current = '';
    if (digitalAutoSaveTimerRef.current) {
      clearTimeout(digitalAutoSaveTimerRef.current);
      digitalAutoSaveTimerRef.current = null;
    }
    if (digitalDraftTimerRef.current) {
      clearTimeout(digitalDraftTimerRef.current);
      digitalDraftTimerRef.current = null;
    }
  }, [load, tab]);

  useEffect(() => {
    setShowTabMenu(false);
  }, [tab]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ADMIN_ACTIVE_TAB_STORAGE_KEY, tab);
    } catch {
      // ignore tab persistence issues
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== 'Certificates' || !visibleCertificateTemplates.length) return;
    setBulkTemplateId((current) => {
      const selectedTemplate = findCertificateTemplate(visibleCertificateTemplates, current);
      return selectedTemplate ? current : getCertificateTemplateKey(visibleCertificateTemplates[0]) || '';
    });
  }, [tab, visibleCertificateTemplates]);

  const getEmptyForm = (t) => {
    const map = { Products: EMPTY_PROD, 'Digital Products': EMPTY_DIGITAL, Certificates: EMPTY_CERT, Training: EMPTY_TRAIN, Delivery: EMPTY_ZONE, Consultations: EMPTY_CONSULT, Blog: EMPTY_BLOG, Featured: EMPTY_FEATURED };
    const next = { ...(map[t] || {}) };
    if (t === 'Digital Products') next.digitalContentsPage = createDefaultDigitalContentsPage();
    return next;
  };

  const resetCustomInputs = () => {
    setCustomCat('');
    setCustomDigitalInputs(createEmptyCustomDigitalInputs());
  };
  const readDigitalDraft = () => {
    try {
      const raw = window.localStorage.getItem(DIGITAL_DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };
  const clearDigitalDraft = () => {
    try {
      window.localStorage.removeItem(DIGITAL_DRAFT_STORAGE_KEY);
    } catch {
      // ignore local draft cleanup issues
    }
  };
  const setDigitalModuleSectionExpanded = (moduleKey, sectionKey, value) => {
    setExpandedDigitalModuleSections((current) => ({
      ...current,
      [moduleKey]: {
        ...DIGITAL_MODULE_SECTION_DEFAULTS,
        ...(current[moduleKey] || {}),
        [sectionKey]: value,
      },
    }));
  };
  const toggleDigitalModuleSection = (moduleKey, sectionKey) => {
    setExpandedDigitalModuleSections((current) => {
      const currentModuleState = {
        ...DIGITAL_MODULE_SECTION_DEFAULTS,
        ...(current[moduleKey] || {}),
      };
      return {
        ...current,
        [moduleKey]: {
          ...currentModuleState,
          [sectionKey]: !currentModuleState[sectionKey],
        },
      };
    });
  };
  const toggleDigitalModuleItemExpanded = (itemKey) => {
    setExpandedDigitalModuleItems((current) => ({ ...current, [itemKey]: !current[itemKey] }));
  };
  const toggleDigitalWritingBlockExpanded = (blockKey) => {
    setExpandedDigitalWritingBlocks((current) => ({ ...current, [blockKey]: !(current[blockKey] ?? true) }));
  };
  const toggleDigitalModuleExpanded = (moduleKey) => {
    setExpandedDigitalModules((current) => ({ ...current, [moduleKey]: !current[moduleKey] }));
  };
  const togglePreviewModuleExpanded = (moduleKey) => {
    setExpandedPreviewModules((current) => ({ ...current, [moduleKey]: !current[moduleKey] }));
  };
  const toggleDigitalContentsPreviewModuleExpanded = (moduleKey) => {
    setExpandedDigitalContentsPreviewModules((current) => ({ ...current, [moduleKey]: !(current[moduleKey] ?? true) }));
  };
  const expandAllDigitalModules = () => {
    const modules = Array.isArray(form.digitalModules) ? form.digitalModules : [];
    setExpandedDigitalModules(Object.fromEntries(modules.map((module, index) => [getModuleUiKey(module, index), true])));
  };
  const collapseAllDigitalModules = () => {
    const modules = Array.isArray(form.digitalModules) ? form.digitalModules : [];
    setExpandedDigitalModules(Object.fromEntries(modules.map((module, index) => [getModuleUiKey(module, index), false])));
  };
  const expandAllPreviewModules = () => {
    const modules = Array.isArray(form.digitalModules) ? form.digitalModules : [];
    setExpandedPreviewModules(Object.fromEntries(modules.map((module, index) => [getModuleUiKey(module, index), true])));
  };
  const collapseAllPreviewModules = () => {
    const modules = Array.isArray(form.digitalModules) ? form.digitalModules : [];
    setExpandedPreviewModules(Object.fromEntries(modules.map((module, index) => [getModuleUiKey(module, index), false])));
  };
  const scrollToDigitalModulesEditor = () => {
    const target = digitalModulesSectionRef.current;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (tab !== 'Digital Products' || !showForm) return;
    const modules = Array.isArray(form.digitalModules) ? form.digitalModules : [];

    setExpandedDigitalModules((current) => {
      const currentKeys = Object.keys(current || {});
      const next = {};
      modules.forEach((module, index) => {
        const key = getModuleUiKey(module, index);
        next[key] = current[key] ?? (currentKeys.length === 0 ? index === 0 : false);
      });
      return next;
    });

    setExpandedDigitalModuleSections((current) => {
      const next = {};
      modules.forEach((module, index) => {
        const key = getModuleUiKey(module, index);
        next[key] = {
          ...DIGITAL_MODULE_SECTION_DEFAULTS,
          ...(current[key] || {}),
        };
      });
      return next;
    });

    setExpandedDigitalModuleItems((current) => {
      const next = {};
      modules.forEach((module, moduleIndex) => {
        const moduleKey = getModuleUiKey(module, moduleIndex);
        (module.items || []).forEach((item, itemIndex) => {
          const itemKey = getModuleItemUiKey(item, moduleKey, itemIndex);
          next[itemKey] = current[itemKey] ?? false;
        });
      });
      return next;
    });

    setExpandedDigitalWritingBlocks((current) => {
      const next = {};
      modules.forEach((module, moduleIndex) => {
        (module.items || []).forEach((item, itemIndex) => {
          if (String(item?.kind || '').trim().toLowerCase() !== 'text') return;
          reindexTextLessonBlocks(item.blocks || []).forEach((block, blockIndex) => {
            const blockKey = String(block.clientKey || block.blockId || block._id || `${moduleIndex}-${itemIndex}-${blockIndex}`);
            next[blockKey] = current[blockKey] ?? true;
          });
        });
      });
      return next;
    });

    setExpandedPreviewModules((current) => {
      const currentKeys = Object.keys(current || {});
      const next = {};
      modules.forEach((module, index) => {
        const key = getModuleUiKey(module, index);
        next[key] = current[key] ?? (currentKeys.length === 0 ? index === 0 : false);
      });
      return next;
    });

    setExpandedDigitalContentsPreviewModules((current) => {
      const currentKeys = Object.keys(current || {});
      const next = {};
      modules.forEach((module, index) => {
        const key = getModuleUiKey(module, index);
        next[key] = current[key] ?? (currentKeys.length === 0 ? index === 0 : false);
      });
      return next;
    });
  }, [form.digitalModules, showForm, tab]);

  useEffect(() => {
    if (!pendingDigitalItemScrollRef.current) return undefined;
    const targetId = pendingDigitalItemScrollRef.current;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      pendingDigitalItemScrollRef.current = '';
    }, 160);
    return () => window.clearTimeout(timer);
  }, [form.digitalModules]);

  const openNew = () => {
    const restoredDraft = tab === 'Digital Products' ? readDigitalDraft() : null;
    setForm(tab === 'Digital Products'
      ? {
          ...getEmptyForm(tab),
          ...(restoredDraft || {}),
          digitalContentsPage: normalizeDigitalContentsPageForForm(restoredDraft?.digitalContentsPage || {}),
        }
      : (restoredDraft || getEmptyForm(tab)));
    setEditId(null);
    setShowForm(true);
    setExpandedDigitalModules({});
    setExpandedDigitalModuleSections({});
    setExpandedDigitalModuleItems({});
    setExpandedDigitalWritingBlocks({});
    setExpandedPreviewModules({});
    setExpandedDigitalContentsPreviewModules({});
    setShowDigitalCustomerPreview(false);
    setShowDigitalContentsPreviewEntries(true);
    setDigitalAutoSave({
      status: restoredDraft ? 'saved' : 'idle',
      message: restoredDraft ? 'Unsaved draft restored locally.' : '',
    });
    lastDigitalAutoSaveSnapshotRef.current = '';
    pendingDigitalItemScrollRef.current = '';
    resetCustomInputs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setShowTabMenu(false);
  };

  const openEdit = (item) => {
    resetCustomInputs();
    setExpandedDigitalModules({});
    setExpandedDigitalModuleSections({});
    setExpandedDigitalModuleItems({});
    setExpandedPreviewModules({});
    setExpandedDigitalContentsPreviewModules({});
    setShowDigitalCustomerPreview(false);
    setShowDigitalContentsPreviewEntries(true);
    if (tab === 'Products') {
      setForm({
        ...item,
        images:          item.images?.length ? item.images : [],
        wholesalePrice:  item.wholesalePrice  || '',
        wholesaleMinQty: item.wholesaleMinQty || '',
        depositPercent:  item.depositPercent  || '',
        stock:           item.stock !== null && item.stock !== undefined ? item.stock : '',
        preOrderType:    item.preOrderType    || '',
        hasDiscount:     !!item.discount,
        discount:        normalizeDiscountForForm(item.discount),
        variants:        item.variants?.length ? JSON.stringify(item.variants) : '',
      });
    } else if (tab === 'Digital Products') {
      const nextForm = {
        ...item,
        category:        'Digital Products',
        images:          item.images?.length ? item.images : [],
        retailPrice:     item.retailPrice || '',
        available:       item.available !== false,
        featured:        !!item.featured,
        fastSelling:     !!item.fastSelling,
        hasDiscount:     !!item.discount,
        discount:        normalizeDiscountForForm(item.discount),
        isDigital:       true,
        digitalType:     item.digitalType || 'mixed',
        digitalSkillLevel: item.digitalSkillLevel || 'all-levels',
        digitalFormat:   item.digitalFormat || '',
        digitalDuration: item.digitalDuration || '',
        digitalTopics:   Array.isArray(item.digitalTopics) ? item.digitalTopics : [],
        digitalInclusions: Array.isArray(item.digitalInclusions) ? item.digitalInclusions : [],
        digitalAccessKind: item.digitalAccessKind || 'paid',
        freeTrialDays:   item.freeTrialDays ? String(item.freeTrialDays) : '7',
        isSeries:        !!item.isSeries,
        seriesTitle:     item.seriesTitle || '',
        seriesDescription: item.seriesDescription || '',
        isCertified:     !!item.isCertified,
        certificateTitle: item.certificateTitle || item.name || '',
        certificateDescription: item.certificateDescription || '',
        accessNote:      item.accessNote || '',
        supportEmail:    item.supportEmail || '',
        supportWhatsApp: item.supportWhatsApp || '',
        digitalContentsPage: normalizeDigitalContentsPageForForm(item.digitalContentsPage || {}),
        digitalModules:  Array.isArray(item.digitalModules) && item.digitalModules.length
          ? reindexDigitalModules(item.digitalModules.map((module, index) => normalizeDigitalModuleForForm(module, index)))
          : buildLegacyDigitalModulesForForm(item),
        digitalManualPages: [],
        digitalFiles: [],
      };
      setForm(nextForm);
      lastDigitalAutoSaveSnapshotRef.current = JSON.stringify(buildDigitalBody(nextForm));
      setDigitalAutoSave({ status: 'saved', message: 'All changes saved.' });
    } else if (tab === 'Certificates') {
      setForm(mapCertificateRecordToForm(item, getCertificateTemplateKey(visibleCertificateTemplates[0]) || ''));
    } else if (tab === 'Featured') {
      // ── Featured edit: map stored product fields back to the featured form ──
      setForm({
        brandName:      item.partnerBrand    || '',
        contactInfo:    item.partnerContact  || '',
        productName:    item.name            || '',
        desc:           item.desc            || '',
        images:         item.images?.length  ? item.images : [],
        category:       item.category        || '',
        price:          item.retailPrice     || '',
        stock:          item.stock !== null && item.stock !== undefined ? item.stock : '',
        available:      item.available       !== false,
        featured:       item.featured        !== false,
        fastSelling:    !!item.fastSelling,
        isPreOrder:     !!item.isPreOrder,
        preOrderType:   item.preOrderType    || '',
        depositPercent: item.depositPercent  || '',
        hasDiscount:    !!item.discount,
        discount:       normalizeDiscountForForm(item.discount),
        plan:           item.partnerPlanMonths || 1,
        isPartner:      true,
        partnerContact: item.partnerContact  || '',
      });
    } else if (tab === 'Blog') {
      setForm({ ...item, tags: item.tags?.join(', ') || '' });
    } else if (tab === 'Training') {
      setForm({
        ...item,
        partners: item.partners?.join(', ') || '',
        sponsors: item.sponsors?.join(', ') || '',
      });
    } else {
      setForm({ ...item });
    }
    setEditId(item._id);
    setShowForm(true);
    pendingDigitalItemScrollRef.current = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setExpandedDigitalModules({});
    setExpandedDigitalModuleSections({});
    setExpandedDigitalModuleItems({});
    setExpandedDigitalWritingBlocks({});
    setExpandedPreviewModules({});
    setExpandedDigitalContentsPreviewModules({});
    setShowDigitalCustomerPreview(false);
    setShowDigitalContentsPreviewEntries(true);
    setDigitalAutoSave({ status: 'idle', message: '' });
    if (digitalAutoSaveTimerRef.current) {
      clearTimeout(digitalAutoSaveTimerRef.current);
      digitalAutoSaveTimerRef.current = null;
    }
    if (digitalDraftTimerRef.current) {
      clearTimeout(digitalDraftTimerRef.current);
      digitalDraftTimerRef.current = null;
    }
    pendingDigitalItemScrollRef.current = '';
    resetCustomInputs();
  };
  const toggleFormArrayValue = (key, value) => setForm(f => {
    const current = Array.isArray(f[key]) ? f[key] : [];
    return {
      ...f,
      [key]: current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
      };
  });
  const applyCustomCategory = () => {
    const nextCategory = String(customCat || '').trim();
    if (!nextCategory) return;
    sf('category', nextCategory);
    setCustomCat('');
  };
  const setCustomDigitalInput = (key, value) => setCustomDigitalInputs((current) => ({ ...current, [key]: value }));
  const applyCustomDigitalSingleValue = (fieldKey, inputKey = fieldKey) => {
    const nextValue = String(customDigitalInputs[inputKey] || '').trim();
    if (!nextValue) return;
    sf(fieldKey, nextValue);
    setCustomDigitalInput(inputKey, '');
  };
  const updateDigitalContentsPageField = (key, value) => setForm((current) => {
    const nextPage = normalizeDigitalContentsPageForForm(current.digitalContentsPage || {});
    return {
      ...current,
      digitalContentsPage: {
        ...nextPage,
        [key]: value,
      },
    };
  });
  const updateDigitalContentsPageStyle = (styleKey, key, value) => setForm((current) => {
    const nextPage = normalizeDigitalContentsPageForForm(current.digitalContentsPage || {});
    return {
      ...current,
      digitalContentsPage: {
        ...nextPage,
        [styleKey]: {
          ...nextPage[styleKey],
          [key]: value,
        },
      },
    };
  });
  const addCustomDigitalArrayValue = (fieldKey, inputKey) => {
    const nextValue = String(customDigitalInputs[inputKey] || '').trim();
    if (!nextValue) return;
    setForm((current) => {
      const currentValues = Array.isArray(current[fieldKey]) ? current[fieldKey] : [];
      return currentValues.includes(nextValue)
        ? current
        : { ...current, [fieldKey]: [...currentValues, nextValue] };
    });
    setCustomDigitalInput(inputKey, '');
  };
  const addDigitalModule = () => {
    const nextModule = createEmptyDigitalModule((Array.isArray(form.digitalModules) ? form.digitalModules.length : 0) + 1);
    const nextModuleKey = getModuleUiKey(nextModule, Array.isArray(form.digitalModules) ? form.digitalModules.length : 0);
    setForm((current) => ({
      ...current,
      digitalModules: reindexDigitalModules([
        ...(Array.isArray(current.digitalModules) ? current.digitalModules : []),
        nextModule,
      ]),
    }));
    setExpandedDigitalModules((current) => ({ ...current, [nextModuleKey]: true }));
    setExpandedDigitalModuleSections((current) => ({
      ...current,
      [nextModuleKey]: { ...DIGITAL_MODULE_SECTION_DEFAULTS, details: true },
    }));
    setExpandedPreviewModules((current) => ({ ...current, [nextModuleKey]: true }));
  };
  const updateDigitalModule = (index, key, value) => setForm((current) => ({
    ...current,
    digitalModules: (current.digitalModules || []).map((module, moduleIndex) => (
      moduleIndex === index ? { ...module, [key]: value } : module
    )),
  }));
  const removeDigitalModule = (index) => setForm((current) => ({
    ...current,
    digitalModules: reindexDigitalModules((current.digitalModules || []).filter((_, moduleIndex) => moduleIndex !== index)),
  }));
  const moveDigitalModule = (index, direction) => setForm((current) => {
    const modules = [...(current.digitalModules || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= modules.length) return current;
    [modules[index], modules[targetIndex]] = [modules[targetIndex], modules[index]];
    return { ...current, digitalModules: reindexDigitalModules(modules) };
  });
  const addTextLessonToModule = (moduleIndex) => {
    const module = Array.isArray(form.digitalModules) ? form.digitalModules[moduleIndex] : null;
    const moduleKey = getModuleUiKey(module, moduleIndex);
    const existingItemCount = Array.isArray(module?.items) ? module.items.length : 0;
    const nextItem = createEmptyDigitalTextItem(existingItemCount + 1);
    const nextItemKey = getModuleItemUiKey(nextItem, moduleKey, existingItemCount);

    setForm((current) => ({
      ...current,
      digitalModules: (current.digitalModules || []).map((currentModule, currentModuleIndex) => (
        currentModuleIndex === moduleIndex
          ? {
              ...currentModule,
              items: reindexDigitalModuleItems([
                ...(currentModule.items || []),
                nextItem,
              ]),
            }
          : currentModule
      )),
    }));
    setExpandedDigitalModules((current) => ({ ...current, [moduleKey]: true }));
    setExpandedDigitalModuleSections((current) => ({
      ...current,
      [moduleKey]: {
        ...DIGITAL_MODULE_SECTION_DEFAULTS,
        ...(current[moduleKey] || {}),
        details: true,
        textComposer: false,
        attachmentComposer: false,
      },
    }));
    setExpandedDigitalModuleItems((current) => ({ ...current, [nextItemKey]: true }));
    pendingDigitalItemScrollRef.current = `digital-module-item-${nextItemKey}`;
  };
  const addFileLessonsToModule = (moduleIndex, files = []) => {
    if (!files?.length) return;
    const module = Array.isArray(form.digitalModules) ? form.digitalModules[moduleIndex] : null;
    const moduleKey = getModuleUiKey(module, moduleIndex);
    const existingItemCount = Array.isArray(module?.items) ? module.items.length : 0;
    const nextItems = files.map((file, fileIndex) => createDigitalFileItem(file, existingItemCount + fileIndex + 1));
    const nextItemKeys = nextItems.map((item, itemIndex) => getModuleItemUiKey(item, moduleKey, existingItemCount + itemIndex));

    setForm((current) => ({
      ...current,
      digitalModules: (current.digitalModules || []).map((module, currentModuleIndex) => (
        currentModuleIndex === moduleIndex
          ? {
              ...module,
              items: reindexDigitalModuleItems([
                ...(module.items || []),
                ...nextItems,
              ]),
            }
          : module
      )),
    }));
    setExpandedDigitalModules((current) => ({ ...current, [moduleKey]: true }));
    setExpandedDigitalModuleSections((current) => ({
      ...current,
      [moduleKey]: {
        ...DIGITAL_MODULE_SECTION_DEFAULTS,
        ...(current[moduleKey] || {}),
        details: true,
        textComposer: false,
        attachmentComposer: false,
      },
    }));
    setExpandedDigitalModuleItems((current) => ({
      ...current,
      ...Object.fromEntries(nextItemKeys.map((itemKey) => [itemKey, true])),
    }));
    pendingDigitalItemScrollRef.current = nextItemKeys[0] ? `digital-module-item-${nextItemKeys[0]}` : '';
  };
  const updateModuleItem = (moduleIndex, itemIndex, key, value) => setForm((current) => ({
    ...current,
    digitalModules: (current.digitalModules || []).map((module, currentModuleIndex) => {
      if (currentModuleIndex !== moduleIndex) return module;
      return {
        ...module,
        items: (module.items || []).map((item, currentItemIndex) => (
          currentItemIndex === itemIndex ? { ...item, [key]: value } : item
        )),
      };
    }),
  }));
  const removeModuleItem = (moduleIndex, itemIndex) => setForm((current) => ({
    ...current,
    digitalModules: (current.digitalModules || []).map((module, currentModuleIndex) => {
      if (currentModuleIndex !== moduleIndex) return module;
      return {
        ...module,
        items: reindexDigitalModuleItems((module.items || []).filter((_, currentItemIndex) => currentItemIndex !== itemIndex)),
      };
    }),
  }));
  const moveModuleItem = (moduleIndex, itemIndex, direction) => setForm((current) => ({
    ...current,
    digitalModules: (current.digitalModules || []).map((module, currentModuleIndex) => {
      if (currentModuleIndex !== moduleIndex) return module;
      const items = [...(module.items || [])];
      const targetIndex = itemIndex + direction;
      if (targetIndex < 0 || targetIndex >= items.length) return module;
      [items[itemIndex], items[targetIndex]] = [items[targetIndex], items[itemIndex]];
      return { ...module, items: reindexDigitalModuleItems(items) };
    }),
  }));
  const updateTextLessonBlocks = (current, moduleIndex, itemIndex, updater) => ({
    ...current,
    digitalModules: (current.digitalModules || []).map((module, currentModuleIndex) => {
      if (currentModuleIndex !== moduleIndex) return module;
      return {
        ...module,
        items: (module.items || []).map((item, currentItemIndex) => {
          if (currentItemIndex !== itemIndex || item.kind !== 'text') return item;
          const nextBlocks = reindexTextLessonBlocks(updater(item.blocks || []));
          return {
            ...item,
            blocks: nextBlocks,
            content: buildTextLessonContentFromBlocks(nextBlocks),
          };
        }),
      };
    }),
  });
  const addTextBlockToLesson = (moduleIndex, itemIndex) => setForm((current) => updateTextLessonBlocks(
    current,
    moduleIndex,
    itemIndex,
    (blocks) => ([...(blocks || []), createEmptyDigitalTextBlock((blocks || []).length + 1)])
  ));
  const addLinkBlockToLesson = (moduleIndex, itemIndex) => setForm((current) => updateTextLessonBlocks(
    current,
    moduleIndex,
    itemIndex,
    (blocks) => ([...(blocks || []), createEmptyDigitalLinkBlock((blocks || []).length + 1)])
  ));
  const addFileBlocksToTextLesson = (moduleIndex, itemIndex, files = []) => {
    if (!files?.length) return;
    setForm((current) => updateTextLessonBlocks(
      current,
      moduleIndex,
      itemIndex,
      (blocks) => ([
        ...(blocks || []),
        ...files.map((file, fileIndex) => createDigitalFileBlock(file, (blocks || []).length + fileIndex + 1)),
      ])
    ));
  };
  const updateTextLessonBlock = (moduleIndex, itemIndex, blockIndex, key, value) => setForm((current) => updateTextLessonBlocks(
    current,
    moduleIndex,
    itemIndex,
    (blocks) => (blocks || []).map((block, currentBlockIndex) => (
      currentBlockIndex === blockIndex ? { ...block, [key]: value } : block
    ))
  ));
  const updateTextLessonBlockRichContent = (moduleIndex, itemIndex, blockIndex, payload = {}) => setForm((current) => updateTextLessonBlocks(
    current,
    moduleIndex,
    itemIndex,
    (blocks) => (blocks || []).map((block, currentBlockIndex) => (
      currentBlockIndex === blockIndex
        ? {
            ...block,
            content: payload.content || '',
            contentHtml: payload.contentHtml || '',
          }
        : block
    ))
  ));
  const toggleDigitalWritingBlockTitleEditor = (blockKey, value) => setVisibleDigitalWritingBlockTitles((current) => ({
    ...current,
    [blockKey]: value,
  }));
  const updateTextLessonBlockPresentation = (moduleIndex, itemIndex, blockIndex, key, value) => setForm((current) => updateTextLessonBlocks(
    current,
    moduleIndex,
    itemIndex,
    (blocks) => (blocks || []).map((block, currentBlockIndex) => {
      if (currentBlockIndex !== blockIndex) return block;
      const nextPresentation = normalizeDigitalWritingBlockPresentationForForm(block.presentation || {});
      return {
        ...block,
        presentation: {
          ...nextPresentation,
          [key]: value,
        },
      };
    })
  ));
  const updateTextLessonBlockPresentationStyle = (moduleIndex, itemIndex, blockIndex, styleKey, key, value) => setForm((current) => updateTextLessonBlocks(
    current,
    moduleIndex,
    itemIndex,
    (blocks) => (blocks || []).map((block, currentBlockIndex) => {
      if (currentBlockIndex !== blockIndex) return block;
      const nextPresentation = normalizeDigitalWritingBlockPresentationForForm(block.presentation || {});
      return {
        ...block,
        presentation: {
          ...nextPresentation,
          [styleKey]: {
            ...nextPresentation[styleKey],
            [key]: value,
          },
        },
      };
    })
  ));
  const toggleTextLessonBlockPresentationStyleFormat = (moduleIndex, itemIndex, blockIndex, styleKey, formatKey) => setForm((current) => updateTextLessonBlocks(
    current,
    moduleIndex,
    itemIndex,
    (blocks) => (blocks || []).map((block, currentBlockIndex) => {
      if (currentBlockIndex !== blockIndex) return block;
      const nextPresentation = normalizeDigitalWritingBlockPresentationForForm(block.presentation || {});
      const fallbackStyle = styleKey === 'titleStyle'
        ? createDigitalWritingBlockTitleStyleFallback(nextPresentation.textStyle)
        : styleKey === 'subtitleStyle'
          ? createDigitalWritingBlockSubtitleStyleFallback(nextPresentation.textStyle)
          : DEFAULT_DIGITAL_WRITING_BLOCK_TEXT_STYLE;
      const nextStyle = {
        ...(nextPresentation[styleKey] || fallbackStyle),
      };

      if (formatKey === 'bold') {
        nextStyle.fontWeight = String(nextStyle.fontWeight || '') === '700' ? fallbackStyle.fontWeight : '700';
      } else if (formatKey === 'italic') {
        nextStyle.fontStyle = nextStyle.fontStyle === 'italic' ? fallbackStyle.fontStyle : 'italic';
      } else if (formatKey === 'underline') {
        nextStyle.textDecoration = nextStyle.textDecoration === 'underline' ? fallbackStyle.textDecoration : 'underline';
      }

      return {
        ...block,
        presentation: {
          ...nextPresentation,
          [styleKey]: nextStyle,
        },
      };
    })
  ));
  const removeTextLessonBlock = (moduleIndex, itemIndex, blockIndex) => setForm((current) => updateTextLessonBlocks(
    current,
    moduleIndex,
    itemIndex,
    (blocks) => (blocks || []).filter((_, currentBlockIndex) => currentBlockIndex !== blockIndex)
  ));
  const moveTextLessonBlock = (moduleIndex, itemIndex, blockIndex, direction) => setForm((current) => updateTextLessonBlocks(
    current,
    moduleIndex,
    itemIndex,
    (blocks) => {
      const nextBlocks = [...(blocks || [])];
      const targetIndex = blockIndex + direction;
      if (targetIndex < 0 || targetIndex >= nextBlocks.length) return nextBlocks;
      [nextBlocks[blockIndex], nextBlocks[targetIndex]] = [nextBlocks[targetIndex], nextBlocks[blockIndex]];
      return nextBlocks;
    }
  ));
  const startModuleDrag = (moduleIndex) => {
    draggedModuleRef.current = { moduleIndex };
  };
  const dropModuleAtIndex = (targetIndex) => setForm((current) => {
    const dragState = draggedModuleRef.current;
    draggedModuleRef.current = null;
    if (!dragState) return current;
    const modules = [...(current.digitalModules || [])];
    if (dragState.moduleIndex === targetIndex || dragState.moduleIndex < 0 || dragState.moduleIndex >= modules.length) return current;
    const [movedModule] = modules.splice(dragState.moduleIndex, 1);
    modules.splice(targetIndex, 0, movedModule);
    return { ...current, digitalModules: reindexDigitalModules(modules) };
  });
  const startModuleItemDrag = (moduleIndex, itemIndex) => {
    draggedModuleItemRef.current = { moduleIndex, itemIndex };
  };
  const dropModuleItemAtIndex = (moduleIndex, targetIndex) => setForm((current) => {
    const dragState = draggedModuleItemRef.current;
    draggedModuleItemRef.current = null;
    if (!dragState || dragState.moduleIndex !== moduleIndex) return current;
    return {
      ...current,
      digitalModules: (current.digitalModules || []).map((module, currentModuleIndex) => {
        if (currentModuleIndex !== moduleIndex) return module;
        const items = [...(module.items || [])];
        if (dragState.itemIndex === targetIndex || dragState.itemIndex < 0 || dragState.itemIndex >= items.length) return module;
        const [movedItem] = items.splice(dragState.itemIndex, 1);
        items.splice(targetIndex, 0, movedItem);
        return { ...module, items: reindexDigitalModuleItems(items) };
      }),
    };
  });
  const startLessonBlockDrag = (moduleIndex, itemIndex, blockIndex) => {
    draggedLessonBlockRef.current = { moduleIndex, itemIndex, blockIndex };
  };
  const dropLessonBlockAtIndex = (moduleIndex, itemIndex, targetIndex) => setForm((current) => {
    const dragState = draggedLessonBlockRef.current;
    draggedLessonBlockRef.current = null;
    if (!dragState || dragState.moduleIndex !== moduleIndex || dragState.itemIndex !== itemIndex) return current;
    return updateTextLessonBlocks(current, moduleIndex, itemIndex, (blocks) => {
      const nextBlocks = [...(blocks || [])];
      if (dragState.blockIndex === targetIndex || dragState.blockIndex < 0 || dragState.blockIndex >= nextBlocks.length) return nextBlocks;
      const [movedBlock] = nextBlocks.splice(dragState.blockIndex, 1);
      nextBlocks.splice(targetIndex, 0, movedBlock);
      return nextBlocks;
    });
  });

  const buildProductBody = (f) => {
    const b = { ...f };
    b.images         = (f.images || []).filter(Boolean);
    b.retailPrice    = Number(f.retailPrice) || 0;
    b.wholesalePrice = f.wholesalePrice ? Number(f.wholesalePrice) : null;
    b.wholesaleMinQty= f.wholesaleMinQty ? Number(f.wholesaleMinQty) : null;
    b.stock          = f.stock !== '' && f.stock !== undefined ? Number(f.stock) : null;
    b.depositPercent = f.depositPercent ? Number(f.depositPercent) : null;
    b.preOrderType   = f.isPreOrder ? (f.preOrderType || null) : null;
    if (!f.isPreOrder) { b.preOrderType = null; b.depositPercent = null; }
    try { b.variants = f.variants ? JSON.parse(f.variants) : []; } catch { b.variants = []; }
    if (f.hasDiscount) {
      b.discount = { ...f.discount, value: Number(f.discount.value) || 0, limitCustomers: f.discount.limitCustomers ? Number(f.discount.limitCustomers) : null, startDate: f.discount.startDate || null, endDate: f.discount.endDate || null, active: true };
    } else { b.discount = null; }
    delete b.hasDiscount;
    return b;
  };

  const buildDigitalBody = (f) => {
    const digitalAccessKind = f.digitalAccessKind || 'paid';
    const b = {
      name:         f.name || '',
      desc:         f.desc || '',
      category:     'Digital Products',
      images:       (f.images || []).filter(Boolean),
      retailPrice:  digitalAccessKind === 'free' ? 0 : (Number(f.retailPrice) || 0),
      available:    f.available !== false,
      featured:     !!f.featured,
      fastSelling:  !!f.fastSelling,
      isDigital:    true,
      digitalType:  f.digitalType || 'mixed',
      digitalSkillLevel: f.digitalSkillLevel || 'all-levels',
      digitalFormat: f.digitalFormat || '',
      digitalDuration: f.digitalDuration || '',
      digitalTopics: Array.isArray(f.digitalTopics) ? f.digitalTopics : [],
      digitalInclusions: Array.isArray(f.digitalInclusions) ? f.digitalInclusions : [],
      digitalAccessKind,
      freeTrialDays: digitalAccessKind === 'trial' ? Math.max(1, Number(f.freeTrialDays) || 7) : 0,
      isSeries:     !!f.isSeries,
      seriesTitle:  f.isSeries ? (f.seriesTitle || '') : '',
      seriesDescription: f.isSeries ? (f.seriesDescription || '') : '',
      isCertified:  !!f.isCertified,
      certificateTitle: f.isCertified ? (f.certificateTitle || f.name || '') : '',
      certificateDescription: f.isCertified ? (f.certificateDescription || '') : '',
      accessNote:   f.accessNote || '',
      supportEmail: f.supportEmail || '',
      supportWhatsApp: f.supportWhatsApp || '',
      digitalContentsPage: normalizeDigitalContentsPageForForm(f.digitalContentsPage || {}),
      digitalModules: reindexDigitalModules(f.digitalModules || []).map((module, moduleIndex) => ({
        _id: module._id,
        moduleNumber: module.moduleNumber || moduleIndex + 1,
        title: module.title || '',
        description: module.description || '',
        items: reindexDigitalModuleItems(module.items || []).map((item, itemIndex) => (
          item.kind === 'file'
            ? {
                _id: item._id,
                kind: 'file',
                order: item.order || itemIndex + 1,
                title: item.title || item.originalFilename || 'Lesson file',
                description: item.description || '',
                allowDownload: !!item.allowDownload,
                watermarkEnabled: isImageModuleFile(item.fileKind) && !!item.allowDownload ? !!item.watermarkEnabled : false,
                watermarkText: isImageModuleFile(item.fileKind) && item.allowDownload && item.watermarkEnabled ? String(item.watermarkText || '').trim() : '',
                secureUrl: item.secureUrl || '',
                publicId: item.publicId || '',
                originalFilename: item.originalFilename || '',
                downloadName: item.downloadName || item.originalFilename || 'download',
                mimeType: item.mimeType || '',
                resourceType: item.resourceType || 'raw',
                fileKind: item.fileKind || 'other',
                bytes: item.bytes || 0,
                blocks: [],
              }
            : {
                _id: item._id,
                kind: 'text',
                order: item.order || itemIndex + 1,
                title: item.title || '',
                description: item.description || '',
                content: buildTextLessonContentFromBlocks(item.blocks || []) || item.content || '',
                blocks: reindexTextLessonBlocks(item.blocks || []).map((block, blockIndex) => (
                  block.kind === 'file'
                    ? {
                        _id: block._id,
                        blockId: block.blockId || '',
                        kind: 'file',
                        order: block.order || blockIndex + 1,
                        title: block.title || block.originalFilename || 'Inline attachment',
                        description: block.description || '',
                        content: '',
                        url: '',
                        openInNewTab: true,
                        allowDownload: !!block.allowDownload || !isPreviewableModuleFile(block.fileKind),
                        watermarkEnabled: isImageModuleFile(block.fileKind) && !!block.allowDownload ? !!block.watermarkEnabled : false,
                        watermarkText: isImageModuleFile(block.fileKind) && block.allowDownload && block.watermarkEnabled ? String(block.watermarkText || '').trim() : '',
                        secureUrl: block.secureUrl || '',
                        publicId: block.publicId || '',
                        originalFilename: block.originalFilename || '',
                        downloadName: block.downloadName || block.originalFilename || 'download',
                        mimeType: block.mimeType || '',
                        resourceType: block.resourceType || 'raw',
                        fileKind: block.fileKind || 'other',
                        bytes: block.bytes || 0,
                      }
                    : block.kind === 'link'
                      ? {
                          _id: block._id,
                          blockId: block.blockId || '',
                          kind: 'link',
                          order: block.order || blockIndex + 1,
                          title: block.title || '',
                          description: block.description || '',
                          content: '',
                          url: block.url || '',
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
                          watermarkEnabled: false,
                          watermarkText: '',
                        }
                      : {
                          _id: block._id,
                          blockId: block.blockId || '',
                          kind: 'text',
                          order: block.order || blockIndex + 1,
                          title: block.title || '',
                          description: block.description || '',
                          presentation: normalizeDigitalWritingBlockPresentationForForm(block.presentation || {}),
                          content: block.content || stripRichTextHtmlToPlainText(block.contentHtml || ''),
                          contentHtml: sanitizeRichTextHtml(block.contentHtml || ''),
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
                          watermarkEnabled: false,
                          watermarkText: '',
                        }
                )).filter((block) => (
                  block.kind === 'file'
                    ? !!block.secureUrl
                    : block.kind === 'link'
                      ? !!String(block.url || block.title || block.description || '').trim()
                      : digitalWritingBlockHasVisibleContent(block)
                )),
              }
        )).filter((item) => (
          item.kind === 'file'
            ? !!item.secureUrl
            : !!String(item.title || item.description || item.content || '').trim() || (item.blocks || []).length > 0
        )),
      })).filter((module) => module.items.length || module.title || module.description),
      digitalManualPages: [],
      digitalFiles: [],
    };
    if (digitalAccessKind !== 'free' && f.hasDiscount) {
      b.discount = { ...f.discount, value: Number(f.discount.value) || 0, limitCustomers: f.discount.limitCustomers ? Number(f.discount.limitCustomers) : null, startDate: f.discount.startDate || null, endDate: f.discount.endDate || null, active: true };
    } else { b.discount = null; }
    return b;
  };

  const buildCertificateBody = (f) => ({
    type: f.type === 'digital_request' ? 'digital_request' : 'manual',
    status: f.status || 'pending',
    digitalAccess: f.digitalAccess || null,
    productId: f.productId || null,
    generationMode: f.generationMode === 'template' ? 'template' : 'manual',
    generationChoiceMade: f.type === 'digital_request' ? !!f.generationChoiceMade : true,
    templateId: f.generationMode === 'template' ? (f.templateId || null) : null,
    templateName: f.generationMode === 'template' ? (f.templateName || '') : '',
    presetKey: f.presetKey || '',
    productName: f.productName || '',
    customerId: f.customerId || '',
    learnerName: f.learnerName || '',
    learnerEmail: f.learnerEmail || '',
    learnerPhone: f.learnerPhone || '',
    requestedAt: f.requestedAt || '',
    requestNotes: f.requestNotes || '',
    completionSnapshot: {
      totalModules: Number(f.completionSnapshot?.totalModules) || 0,
      completedModules: Number(f.completionSnapshot?.completedModules) || 0,
      percent: Number(f.completionSnapshot?.percent) || 0,
    },
    certificateTitle: f.certificateTitle || f.productName || '',
    certificateSubtitle: f.certificateSubtitle || '',
    certificateBody: f.certificateBody || '',
    primaryColor: f.primaryColor || '#111827',
    accentColor: f.accentColor || '#FDC700',
    backgroundColor: f.backgroundColor || '#FFFDF7',
    fontColor: f.fontColor || '#374151',
    fontFamily: f.fontFamily || 'classic_serif',
    frameStyle: f.frameStyle || 'classic',
    issueDate: f.issueDate || '',
    organizerName: f.organizerName || '',
    sponsors: f.sponsors ? f.sponsors.split(',').map(item => item.trim()).filter(Boolean) : [],
    signatories: [
      { name: f.signatoryOneName || '', role: f.signatoryOneRole || '' },
      { name: f.signatoryTwoName || '', role: f.signatoryTwoRole || '' },
    ].filter(item => item.name || item.role),
    notes: f.notes || '',
  });

  const buildBlogBody = (f) => ({
    ...f,
    tags:       f.tags ? f.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    coverImage: convertDrive(f.coverImage),
  });

const buildTrainingBody = (f) => ({
  ...f,
  price:    Number(f.price),
  capacity: f.capacity ? Number(f.capacity) : null,
  image:    convertDrive(f.image),
  partners: f.partners ? f.partners.split(',').map(t => t.trim()).filter(Boolean) : [],
  sponsors: f.sponsors ? f.sponsors.split(',').map(t => t.trim()).filter(Boolean) : [],
  active:   f.active !== false,
});

  const buildFeaturedBody = (f) => {
    const b = {
      name:              f.productName || f.name || '',
      desc:              f.desc        || '',
      category:          f.category    || '',
      images:            (f.images     || []).filter(Boolean),
      retailPrice:       f.price ? Number(f.price) : 0,
      stock:             f.stock !== '' && f.stock !== undefined ? Number(f.stock) : null,
      available:         f.available  !== false,
      featured:          f.featured   !== false,
      fastSelling:       !!f.fastSelling,
      isPreOrder:        !!f.isPreOrder,
      preOrderType:      f.isPreOrder ? (f.preOrderType || null) : null,
      depositPercent:    f.isPreOrder && f.preOrderType === 'deposit' ? Number(f.depositPercent) : null,
      isPartner:         true,
      partnerBrand:      f.brandName   || '',   // optional
      partnerContact:    f.contactInfo || '',   // optional
      partnerPlanMonths: Number(f.plan) || 1,
      partnerSubEnd:     (() => { const d = new Date(); d.setMonth(d.getMonth() + (Number(f.plan) || 1)); return d; })(),
    };
    if (f.hasDiscount) {
      b.discount = { ...f.discount, value: Number(f.discount.value) || 0, active: true, limitCustomers: null, startDate: null, endDate: f.discount.endDate || null };
    } else { b.discount = null; }
    return b;
  };

  useEffect(() => {
    if (tab !== 'Digital Products' || !showForm) return undefined;

    if (!editId) {
      if (digitalDraftTimerRef.current) clearTimeout(digitalDraftTimerRef.current);
      digitalDraftTimerRef.current = setTimeout(() => {
        try {
          window.localStorage.setItem(DIGITAL_DRAFT_STORAGE_KEY, JSON.stringify(form || {}));
          setDigitalAutoSave({ status: 'saved', message: 'Draft autosaved locally.' });
        } catch {
          setDigitalAutoSave({ status: 'error', message: 'Could not store the draft on this device.' });
        }
      }, 900);

      return () => {
        if (digitalDraftTimerRef.current) {
          clearTimeout(digitalDraftTimerRef.current);
          digitalDraftTimerRef.current = null;
        }
      };
    }

    const body = buildDigitalBody(form);
    const snapshot = JSON.stringify(body);
    if (!snapshot || snapshot === lastDigitalAutoSaveSnapshotRef.current) return undefined;

    if (digitalAutoSaveTimerRef.current) clearTimeout(digitalAutoSaveTimerRef.current);
    setDigitalAutoSave({ status: 'saving', message: 'Autosave queued...' });
    digitalAutoSaveTimerRef.current = setTimeout(async () => {
      try {
        setDigitalAutoSave({ status: 'saving', message: 'Autosaving changes...' });
        const { data: updated } = await api.put(`/api/products/${editId}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        lastDigitalAutoSaveSnapshotRef.current = snapshot;
        clearDigitalDraft();
        setDigitalAutoSave({
          status: 'saved',
          message: `Autosaved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        });
        setData((current) => current.map((entry) => (entry._id === updated?._id ? updated : entry)));
      } catch (error) {
        setDigitalAutoSave({
          status: 'error',
          message: error.response?.data?.message || 'Autosave could not finish right now.',
        });
      }
    }, 1200);

    return () => {
      if (digitalAutoSaveTimerRef.current) {
        clearTimeout(digitalAutoSaveTimerRef.current);
        digitalAutoSaveTimerRef.current = null;
      }
    };
  }, [DIGITAL_DRAFT_STORAGE_KEY, editId, form, showForm, tab, token]);

  const save = async () => {
    // For Featured, save via products endpoint (they are products with isPartner flag)
    const ep = tab === 'Featured' || tab === 'Digital Products' ? '/api/products' : ENDPOINTS[tab];
    let body = { ...form };
    if (tab === 'Certificates' && form.type === 'digital_request' && !form.generationChoiceMade) {
      alert('Choose whether to use the manual generator or a saved template for this learner request first.');
      return;
    }
    if (tab === 'Certificates' && form.generationMode === 'template' && !form.templateId) {
      alert('Select a saved certificate template first, or switch back to manual generator.');
      return;
    }
    if (tab === 'Products')      body = buildProductBody(form);
    if (tab === 'Digital Products') body = buildDigitalBody(form);
    if (tab === 'Certificates')  body = buildCertificateBody(form);
    if (tab === 'Blog')          body = buildBlogBody(form);
    if (tab === 'Training')      body = buildTrainingBody(form);
    if (tab === 'Featured')      body = buildFeaturedBody(form);
    if (tab === 'Delivery')      body = { name: form.name, fee: Number(form.fee) };
    if (tab === 'Consultations') body = { ...form, price: Number(form.price) || 0 };
    try {
      if (digitalAutoSaveTimerRef.current) {
        clearTimeout(digitalAutoSaveTimerRef.current);
        digitalAutoSaveTimerRef.current = null;
      }
      if (digitalDraftTimerRef.current) {
        clearTimeout(digitalDraftTimerRef.current);
        digitalDraftTimerRef.current = null;
      }
      let savedRecord;
      if (editId) {
        const { data: updated } = await api.put(`${ep}/${editId}`, body, auth);
        savedRecord = updated;
      } else {
        const { data: created } = await api.post(ep, body, auth);
        savedRecord = created;
      }
      if (tab === 'Digital Products') {
        clearDigitalDraft();
        lastDigitalAutoSaveSnapshotRef.current = editId ? JSON.stringify(body) : '';
        setDigitalAutoSave({ status: 'saved', message: 'All changes saved.' });
        if (savedRecord?._id) {
          setData((current) => current.map((entry) => (entry._id === savedRecord._id ? savedRecord : entry)));
        }
      }
      loadSavedCategories();
      load(tab, search);
      closeForm();
    } catch (e) { alert(e.response?.data?.message || 'Error saving. Check all required fields.'); }
  };

  const del = async (id) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    const ep = tab === 'Featured' || tab === 'Digital Products' ? '/api/products' : ENDPOINTS[tab];
    await api.delete(`${ep}/${id}`, auth);
    setData(d => d.filter(x => x._id !== id));
    loadSavedCategories();
  };

  const toggle = async (id, ep) => {
    const endpoint = ep || ((tab === 'Featured' || tab === 'Digital Products') ? '/api/products' : ENDPOINTS[tab]);
    const { data: updated } = await api.patch(`${endpoint}/${id}/toggle`, {}, auth);
    setData(d => d.map(x => x._id === id ? updated : x));
  };

  const sf  = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const sfd = (key, val) => setForm(f => ({ ...f, discount: { ...f.discount, [key]: val } }));
  const reloadCertificateTemplates = useCallback(async () => {
    const { data: templates } = await api.get('/api/certificates/templates', auth);
    const nextTemplates = Array.isArray(templates) ? templates : [];
    setCertificateTemplates(nextTemplates);
    return nextTemplates;
  }, [auth]);

  const ensureCertificateTemplateStored = useCallback(async (template) => {
    if (!template) return null;
    if (template._id) return template;

    const payload = {
      name: template.name || 'Certificate Template',
      presetKey: template.presetKey || '',
      productName: template.productName || '',
      certificateTitle: template.certificateTitle || '',
      certificateSubtitle: template.certificateSubtitle || '',
      certificateBody: template.certificateBody || '',
      primaryColor: template.primaryColor || '#111827',
      accentColor: template.accentColor || '#FDC700',
      backgroundColor: template.backgroundColor || '#FFFDF7',
      fontColor: template.fontColor || '#374151',
      fontFamily: template.fontFamily || 'classic_serif',
      frameStyle: template.frameStyle || 'classic',
      issueDate: template.issueDate || '',
      organizerName: template.organizerName || '',
      sponsors: Array.isArray(template.sponsors) ? template.sponsors : [],
      signatories: Array.isArray(template.signatories) ? template.signatories : [],
      notes: template.notes || '',
      isPreset: !!template.isPreset,
    };

    const { data: created } = await api.post('/api/certificates/templates', payload, auth);
    const refreshed = await reloadCertificateTemplates().catch(() => []);
    return findCertificateTemplate(refreshed, created?._id || template.presetKey || '') || created;
  }, [auth, reloadCertificateTemplates]);

  const applySelectedCertificateTemplate = useCallback((templateId, options = {}) => {
    const template = findCertificateTemplate(visibleCertificateTemplates, templateId);
    if (!template) return false;
    setForm((current) => ({
      ...applyCertificateTemplateToForm(current, template),
      generationChoiceMade: options.markChosen ?? true,
      templatePickerOpen: options.keepPickerOpen ?? false,
      templateCandidateId: getCertificateTemplateKey(template),
    }));
    return true;
  }, [visibleCertificateTemplates]);

  const applyCertificateTemplateFromPicker = useCallback(async (template, options = {}) => {
    try {
      setCertificateBusy('template-sync');
      const storedTemplate = await ensureCertificateTemplateStored(template);
      if (!storedTemplate) {
        alert('Selected certificate template was not found.');
        return;
      }
      if (!applySelectedCertificateTemplate(getCertificateTemplateKey(storedTemplate), options)) {
        setForm((current) => ({
          ...applyCertificateTemplateToForm(current, storedTemplate),
          generationChoiceMade: options.markChosen ?? true,
          templatePickerOpen: options.keepPickerOpen ?? false,
          templateCandidateId: getCertificateTemplateKey(storedTemplate),
        }));
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Could not prepare the selected template.');
    } finally {
      setCertificateBusy('');
    }
  }, [applySelectedCertificateTemplate, ensureCertificateTemplateStored]);

  const chooseManualCertificateGenerator = () => {
    setForm((current) => ({
      ...current,
      generationMode: 'manual',
      generationChoiceMade: true,
      templateId: '',
      templateName: '',
      templatePickerOpen: false,
      templateCandidateId: '',
    }));
  };

  const openCertificateTemplateChooser = useCallback(() => {
    setForm((current) => ({
      ...current,
      templatePickerOpen: true,
      templateCandidateId: current.templateCandidateId || current.templateId || getCertificateTemplateKey(visibleCertificateTemplates[0]) || '',
    }));
  }, [visibleCertificateTemplates]);

  const openManualCertificateTemplateLibrary = useCallback(() => {
    setForm((current) => ({
      ...current,
      generationMode: 'template',
      templatePickerOpen: true,
      templateCandidateId: current.templateId || current.templateCandidateId || getCertificateTemplateKey(visibleCertificateTemplates[0]) || '',
    }));
  }, [visibleCertificateTemplates]);

  const previewCertificateTemplateRecord = useCallback((template) => {
    if (!template) return;
    const previewForm = {
      ...applyCertificateTemplateToForm(form, template),
      learnerName: form.learnerName || 'Learner Name',
      productName: form.productName || template.productName || 'Programme',
      generationChoiceMade: true,
    };
    generateCertificate(buildCertificateBody(previewForm), { autoPrint: false });
  }, [form]);

  const resetCertificateGenerationChoice = () => {
    setForm((current) => ({
      ...current,
      generationChoiceMade: false,
      templatePickerOpen: false,
      templateCandidateId: current.templateId || current.templateCandidateId || '',
    }));
  };

  const openCertificateTemplateSelectorFromCard = (item) => {
    setForm({
      ...mapCertificateRecordToForm(item, getCertificateTemplateKey(visibleCertificateTemplates[0]) || ''),
      templatePickerOpen: true,
      templateCandidateId: item.templateId || item.presetKey || getCertificateTemplateKey(visibleCertificateTemplates[0]) || '',
    });
    setEditId(item._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveCertificateTemplate = async () => {
    const templateName = prompt('Template name for future certificate use');
    if (!templateName?.trim()) return;

    try {
      setCertificateBusy('save-template');
      const payload = {
        ...buildCertificateBody(form),
        name: templateName.trim(),
      };
      await api.post('/api/certificates/templates', payload, auth);
      const templates = await reloadCertificateTemplates();
      setBulkTemplateId((current) => current || getCertificateTemplateKey(mergeCertificateTemplates(templates)[0]) || '');
      alert('Certificate template saved');
    } catch (e) {
      alert(e.response?.data?.message || 'Could not save certificate template');
    } finally {
      setCertificateBusy('');
    }
  };

  const bulkGenerateFromTemplate = async () => {
    if (!bulkTemplateId) return alert('Select a saved bulk template first');
    if (!bulkLearners.trim()) return alert('Paste at least one learner line first');

    try {
      setCertificateBusy('bulk-generate');
      const selectedTemplate = findCertificateTemplate(visibleCertificateTemplates, bulkTemplateId);
      const storedTemplate = await ensureCertificateTemplateStored(selectedTemplate);
      if (!storedTemplate?._id) {
        alert('Select a valid certificate template first.');
        return;
      }
      setBulkTemplateId(getCertificateTemplateKey(storedTemplate));
      const { data: created } = await api.post('/api/certificates/bulk-generate', {
        templateId: storedTemplate._id,
        bulkText: bulkLearners,
        productName: form.productName || '',
        issueDate: form.issueDate || '',
      }, auth);
      setBulkLearners('');
      await load('Certificates', search);
      alert(`${Array.isArray(created) ? created.length : 0} certificate(s) generated`);
    } catch (e) {
      alert(e.response?.data?.message || 'Bulk generation failed');
    } finally {
      setCertificateBusy('');
    }
  };

  const sendCertificateEmail = async (item) => {
    if (!item?._id) return;
    const existingEmail = item.learnerEmail || '';
    const emailTo = prompt('Send certificate to this email', existingEmail);
    if (emailTo === null) return;

    try {
      setCertificateBusy(`email-${item._id}`);
      const { data: response } = await api.post(`/api/certificates/${item._id}/send-email`, {
        learnerEmail: emailTo.trim(),
      }, auth);
      const updated = response.certificate;
      setData(current => current.map(entry => entry._id === updated._id ? updated : entry));
      if (editId === updated._id) openEdit(updated);
      alert(`Certificate email sent${response.delivery?.provider ? ` via ${response.delivery.provider}` : ''}. This certificate is now marked as issued.`);
    } catch (e) {
      alert(e.response?.data?.message || 'Could not send the certificate email');
    } finally {
      setCertificateBusy('');
    }
  };

  const downloadCertificatePdf = async (item) => {
    if (!item?._id) return;

    try {
      setCertificateBusy(`download-${item._id}`);
      const response = await api.get(`/api/certificates/${item._id}/download`, {
        ...auth,
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers?.['content-disposition'] || '';
      const match = disposition.match(/filename="([^"]+)"/i);
      link.href = url;
      link.download = match?.[1] || `${item.certificateNumber || item.certificateTitle || 'certificate'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.response?.data?.message || 'Could not download the certificate PDF');
    } finally {
      setCertificateBusy('');
    }
  };

  const shareCertificateWhatsApp = async (item) => {
    if (!item?._id) return;
    const existingPhone = item.learnerPhone || '';
    const learnerPhone = prompt('Share certificate on WhatsApp using this number', existingPhone);
    if (learnerPhone === null) return;

    try {
      setCertificateBusy(`whatsapp-${item._id}`);
      const { data: response } = await api.post(`/api/certificates/${item._id}/share-whatsapp`, {
        learnerPhone: learnerPhone.trim(),
      }, auth);
      if (response.certificate) {
        setData(current => current.map(entry => entry._id === response.certificate._id ? response.certificate : entry));
        if (editId === response.certificate._id) openEdit(response.certificate);
      }
      const popup = window.open(response.url, '_blank', 'noopener,noreferrer');
      if (!popup) window.location.assign(response.url);
    } catch (e) {
      alert(e.response?.data?.message || 'Could not prepare the WhatsApp certificate link');
    } finally {
      setCertificateBusy('');
    }
  };

  const adminDigitalProducts = data.filter((item) => item?.isDigital || item?.category === 'Digital Products');
  const allCats = collectDistinctValues([
    ...CATEGORY_VALUES.filter(v => v !== 'All'),
    ...savedCategories,
    ...data.map((item) => item?.category),
    form?.category,
    customCat,
  ]);
  const physicalCats = allCats.filter(c => c !== 'Digital Products');
  const digitalTypeOptions = mergeDigitalOptions(
    DIGITAL_TYPE_OPTIONS.filter((option) => option.value !== 'all'),
    [...collectDistinctFieldValues(adminDigitalProducts, 'digitalType'), form?.digitalType, customDigitalInputs.digitalType]
  );
  const digitalSkillLevelOptions = mergeDigitalOptions(
    DIGITAL_SKILL_LEVEL_OPTIONS.filter((option) => option.value !== 'all'),
    [...collectDistinctFieldValues(adminDigitalProducts, 'digitalSkillLevel'), form?.digitalSkillLevel, customDigitalInputs.digitalSkillLevel]
  );
  const digitalFormatOptions = mergeDigitalOptions(
    DIGITAL_FORMAT_OPTIONS.filter((option) => option.value !== 'all'),
    [...collectDistinctFieldValues(adminDigitalProducts, 'digitalFormat'), form?.digitalFormat, customDigitalInputs.digitalFormat]
  );
  const digitalDurationOptions = mergeDigitalOptions(
    DIGITAL_DURATION_OPTIONS.filter((option) => option.value !== 'all'),
    [...collectDistinctFieldValues(adminDigitalProducts, 'digitalDuration'), form?.digitalDuration, customDigitalInputs.digitalDuration]
  );
  const digitalTopicOptions = mergeDigitalOptions(
    DIGITAL_TOPIC_OPTIONS,
    [...collectDistinctListValues(adminDigitalProducts, 'digitalTopics'), ...(Array.isArray(form?.digitalTopics) ? form.digitalTopics : []), customDigitalInputs.digitalTopic]
  );
  const digitalInclusionOptions = mergeDigitalOptions(
    DIGITAL_INCLUSION_OPTIONS,
    [...collectDistinctListValues(adminDigitalProducts, 'digitalInclusions'), ...(Array.isArray(form?.digitalInclusions) ? form.digitalInclusions : []), customDigitalInputs.digitalInclusion]
  );

  // ── Login screen ─────────────────────────────────────────────────────────────
  if (!token) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="font-extrabold text-xl">BELLE <span className="text-[#FDC700]">KREYASHON</span></div>
          <p className="text-gray-400 text-sm mt-1">Admin Dashboard</p>
        </div>
        {!reset ? (
          <>
            <p className="text-sm font-bold text-center mb-2">{setup === false ? 'Create your PIN' : 'Enter your PIN'}</p>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
              placeholder={setup === false ? 'Create PIN (min 4 digits)' : 'Enter PIN'}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-xl tracking-widest outline-none focus:border-black mb-3" />
            {sessionMsg && <p className="text-amber-600 text-xs text-center mb-2">{sessionMsg}</p>}
            {authErr && <p className="text-red-500 text-xs text-center mb-2">{authErr}</p>}
            <button onClick={login} className="w-full py-3 bg-black text-white font-extrabold rounded-xl hover:bg-gray-900 mb-2">{setup === false ? 'Create PIN' : 'Login'}</button>
            <button onClick={() => { setReset(true); setAuthErr(''); }} className="w-full text-xs text-gray-400 hover:text-black">Forgot PIN?</button>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-center mb-3">Reset PIN</p>
            <input type="password" value={mPin}   onChange={e => setMPin(e.target.value)}   placeholder="Master reset PIN" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center tracking-widest outline-none mb-2" />
            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New PIN"           className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center tracking-widest outline-none mb-3" />
            {sessionMsg && <p className="text-amber-600 text-xs text-center mb-2">{sessionMsg}</p>}
            {authErr && <p className="text-red-500 text-xs text-center mb-2">{authErr}</p>}
            <button onClick={resetPin} className="w-full py-3 bg-black text-white font-extrabold rounded-xl mb-2">Reset</button>
            <button onClick={() => { setReset(false); setAuthErr(''); }} className="w-full text-xs text-gray-400 hover:text-black">Back</button>
          </>
        )}
      </div>
    </div>
  );
  const collectionData = tab === 'Digital Products'
    ? data.filter((item) => item?.isDigital || item?.category === 'Digital Products')
    : tab === 'Products'
      ? data.filter((item) => !item?.isDigital)
      : data;
  const pagedData  = collectionData.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = Math.ceil(collectionData.length / PAGE_SIZE);
  const tabsWithoutSearch = ['Analytics', 'Abandoned', 'Delivery', 'Invoice'];
  const canToggleView = !['Analytics', 'Invoice'].includes(tab);
  const collectionLayoutClass = getCollectionLayoutClass(tab, viewMode);
  const useGridCards = viewMode === 'grid';
  const mobileActionTabs = !['Analytics', 'Orders','Abandoned','Bookings','Customers','Invoice'].includes(tab);
  const analyticsSummary = salesAnalytics?.summary || {};
  const analyticsBreakdown = salesAnalytics?.breakdown || [];
  const analyticsPageBreakdown = salesAnalytics?.pageBreakdown || [];
  const analyticsCampaignBreakdown = salesAnalytics?.campaignBreakdown || [];
  const analyticsMonthlyRevenue = salesAnalytics?.monthlyRevenue || [];
  const analyticsBestSellerMonths = salesAnalytics?.bestSellers?.monthly || [];
  const analyticsPreviousWeekBestSellers = salesAnalytics?.bestSellers?.previousWeek || null;
  const analyticsRecentSales = salesAnalytics?.recentSales || [];
  const certificateChoicePending = tab === 'Certificates' && form.type === 'digital_request' && !form.generationChoiceMade;
  const activeCertificateTemplateId = form.templateCandidateId || form.templateId || '';
  const activeCertificateTemplate = findCertificateTemplate(visibleCertificateTemplates, activeCertificateTemplateId);
  const hasPresetCertificateTemplates = visibleCertificateTemplates.some((template) => template.isPreset);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white px-4 py-3.5 flex justify-between items-center sticky top-0 z-20">
        <div className="min-w-0 font-extrabold text-sm sm:text-base">
          BELLE <span className="text-[#FDC700]">KREYASHON</span> <span className="text-gray-500 font-normal text-xs ml-1">Admin</span>
        </div>
        <button onClick={logout} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white shrink-0">
          <LogOut size={14} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Mobile section switcher */}
      <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 sticky top-14 z-[15]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTabMenu(true)}
            className="inline-flex items-center justify-center h-11 w-11 rounded-2xl border border-gray-200 bg-gray-50 text-gray-700"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-[#fcfbf7] px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Current Section</p>
            <p className="text-sm font-extrabold text-gray-900 truncate">{tab}</p>
          </div>
          {canToggleView && (
            <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-white p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
              >
                <List size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all ${viewMode === 'grid' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop tabs */}
      <div className="hidden md:block bg-white border-b border-gray-100 sticky top-14 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap gap-x-1">
            {TABS.map(t => (
              <button key={t} onClick={() => handleTabChange(t)}
                className={`px-3 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${tab === t ? 'border-[#FDC700] text-black' : 'border-transparent text-gray-400 hover:text-black'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showTabMenu && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setShowTabMenu(false)}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white px-4 py-4 shadow-2xl max-h-[78vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B88900]">Admin Sections</p>
                <h3 className="text-lg font-extrabold mt-1">Choose where to work</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTabMenu(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TABS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTabChange(t)}
                  className={`rounded-2xl border px-3 py-3 text-left text-sm font-bold transition-all ${
                    tab === t
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-[#fcfbf7] text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* Search + Add bar */}
        <div className="flex flex-col gap-3 mb-5 lg:flex-row lg:items-center">
          {!tabsWithoutSearch.includes(tab) ? (
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load(tab, search)}
                placeholder={`Search ${tab.toLowerCase()}...`}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black" />
            </div>
          ) : <div className="hidden lg:block flex-1" />}
          <div className="flex flex-wrap gap-2 sm:flex-nowrap lg:justify-end">
            {canToggleView && (
              <div className="hidden md:inline-flex items-center rounded-xl border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex h-9 items-center justify-center gap-1 rounded-lg px-3 text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
                >
                  <List size={14} />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex h-9 items-center justify-center gap-1 rounded-lg px-3 text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}
                >
                  <LayoutGrid size={14} />
                  Grid
                </button>
              </div>
            )}
            {mobileActionTabs && (
              <button onClick={openNew} className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-4 py-2.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900 shrink-0">
                <Plus size={15} /> Add
              </button>
            )}
            {['Orders','Abandoned'].includes(tab) && search && (
              <button onClick={() => { setSearch(''); load(tab,''); }} className="px-3 py-2.5 bg-gray-100 text-sm font-bold rounded-xl hover:bg-gray-200 shrink-0"><X size={14} /></button>
            )}
            {!tabsWithoutSearch.includes(tab) && (
              <button onClick={() => load(tab, search)} className="flex-1 sm:flex-none px-4 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-900 shrink-0">Search</button>
            )}
            {tab === 'Analytics' && (
              <button onClick={() => load(tab, '')} className="flex-1 sm:flex-none px-4 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-900 shrink-0">Refresh</button>
            )}
          </div>
        </div>

        {/* ── FORM PANEL ─────────────────────────────────────────────────────── */}
        {showForm && !['Analytics','Orders','Abandoned','Customers'].includes(tab) && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="min-w-0">
                <h3 className="font-extrabold">{editId ? `Edit ${TAB_FORM_LABELS[tab] || tab}` : `New ${TAB_FORM_LABELS[tab] || tab}`}</h3>
                {tab === 'Digital Products' && (
                  <p className={`mt-1 text-xs font-bold ${
                    digitalAutoSave.status === 'error'
                      ? 'text-red-500'
                      : digitalAutoSave.status === 'saving'
                        ? 'text-amber-600'
                        : 'text-gray-500'
                  }`}>
                    {digitalAutoSave.message || (editId ? 'Autosave ready while you edit.' : 'Draft autosave is on for this digital product form.')}
                  </p>
                )}
              </div>
              <button onClick={closeForm}><X size={18} className="text-gray-400 hover:text-black" /></button>
            </div>

            {/* ── PRODUCTS form ── */}
            {tab === 'Products' && (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.name||''} onChange={e => sf('name',e.target.value)} placeholder="Product name *" className={inp} />
                  <div className="flex gap-2">
                    <select value={form.category||''} onChange={e => sf('category',e.target.value)} className={inp+' flex-1'}>
                      <option value="">Category *</option>
                      {physicalCats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <input value={customCat} onChange={e => setCustomCat(e.target.value)} placeholder="Or type a new category..." className={inp+' flex-1'} />
                    {customCat && <button type="button" onClick={applyCustomCategory} className="px-3 py-2 bg-[#FDC700] text-black text-xs font-bold rounded-xl whitespace-nowrap">Use</button>}
                  </div>
                  <input value={form.retailPrice||''}    onChange={e => sf('retailPrice',e.target.value)}    placeholder="Retail price (GHS) *"          type="number" className={inp} />
                  <input value={form.wholesalePrice||''}  onChange={e => sf('wholesalePrice',e.target.value)}  placeholder="Wholesale price (optional)"     type="number" className={inp} />
                  <input value={form.wholesaleMinQty||''} onChange={e => sf('wholesaleMinQty',e.target.value)} placeholder="Min wholesale qty"              type="number" className={inp} />
                  <input value={form.stock||''}           onChange={e => sf('stock',e.target.value)}           placeholder="Stock qty (blank = unlimited)"  type="number" className={inp} />
                  <textarea value={form.desc||''} onChange={e => sf('desc',e.target.value)} placeholder="Description" rows={2} className={inp+' resize-none sm:col-span-2'} />

                  {/* Image uploader — max 3 */}
                  <ImageUploader
                    images={form.images || []}
                    onChange={urls => sf('images', urls)}
                    uploadEndpoint="/api/products/upload"
                    token={token}
                    maxImages={3}
                  />
                </div>

                <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-xl">
                  {[['available','Available'],['featured','Featured'],['fastSelling','Fast Selling'],['isPreOrder','Pre-Order'],['hasDiscount','Discount'],['isPartner','Partner Product']].map(([k,l]) => (
                    <label key={k} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input type="checkbox" checked={!!form[k]} onChange={e => sf(k,e.target.checked)} className="w-4 h-4 accent-black" /> {l}
                    </label>
                  ))}
                </div>

                {form.isPreOrder && (
                  <div className="grid sm:grid-cols-2 gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                    <p className="sm:col-span-2 text-xs font-bold text-yellow-800">Pre-Order</p>
                    <select value={form.preOrderType||''} onChange={e => sf('preOrderType',e.target.value)} className={inp}>
                      <option value="">Payment type *</option>
                      <option value="deposit">Deposit only</option>
                      <option value="full">Full payment</option>
                    </select>
                    {form.preOrderType === 'deposit' && <input value={form.depositPercent||''} onChange={e => sf('depositPercent',e.target.value)} placeholder="Deposit %" type="number" className={inp} />}
                  </div>
                )}

                {form.isPartner && (
                  <div className="grid sm:grid-cols-2 gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="sm:col-span-2 text-xs font-bold text-blue-800">Partner Info (Private — not shown to customers)</p>
                    <input value={form.partnerBrand||''}   onChange={e => sf('partnerBrand',e.target.value)}   placeholder="Brand / business name"           className={inp} />
                    <input value={form.partnerContact||''} onChange={e => sf('partnerContact',e.target.value)} placeholder="Brand contact (WhatsApp / email)" className={inp} />
                  </div>
                )}

                {form.hasDiscount && (
                  <div className="grid sm:grid-cols-2 gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <p className="sm:col-span-2 text-xs font-bold text-green-800">Discount Settings</p>
                    <select value={form.discount?.type||'percent'} onChange={e => sfd('type',e.target.value)} className={inp}>
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed amount (GHS)</option>
                    </select>
                    <input value={form.discount?.value||''}          onChange={e => sfd('value',e.target.value)}          placeholder={form.discount?.type==='percent'?'e.g. 20':'e.g. 50'} type="number" className={inp} />
                    <input value={form.discount?.label||''}          onChange={e => sfd('label',e.target.value)}          placeholder='Label e.g. "Flash Sale!"'                             className={inp} />
                    <input value={form.discount?.limitCustomers||''} onChange={e => sfd('limitCustomers',e.target.value)} placeholder="First N customers only (optional)"  type="number"     className={inp} />
                    <input value={form.discount?.startDate||''}      onChange={e => sfd('startDate',e.target.value)}      type="date" className={inp} />
                    <input value={form.discount?.endDate||''}        onChange={e => sfd('endDate',e.target.value)}        type="date" className={inp} />
                    <p className="sm:col-span-2 text-xs text-green-700">Auto-deactivates after end date or when customer limit is reached.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── TRAINING form ── */}
            {tab === 'Digital Products' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#FDC700]/30 bg-[#fcfbf7] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9a7a00] mb-1">Digital Product Setup</p>
                  <div className="mt-1 flex flex-wrap items-start gap-2">
                    <p className="text-[10px] leading-relaxed text-gray-400">
                      Protected files, lessons, and bundled digital resources.
                    </p>
                    <AdminHoverHint
                      text="Use this form for protected downloads like PDFs, videos, templates, audio files and bundled digital resources. Uploaded files here stay separate from regular shop products."
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.name||''} onChange={e => sf('name',e.target.value)} placeholder="Digital product name *" className={inp} />
                  <div className="space-y-2">
                    <select value={form.digitalType||'mixed'} onChange={e => sf('digitalType',e.target.value)} className={inp}>
                      {digitalTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        value={customDigitalInputs.digitalType}
                        onChange={e => setCustomDigitalInput('digitalType', e.target.value)}
                        placeholder="Or add a new digital type"
                        className={inp + ' flex-1'}
                      />
                      {customDigitalInputs.digitalType.trim() && (
                        <button type="button" onClick={() => applyCustomDigitalSingleValue('digitalType')} className="px-3 py-2 bg-[#FDC700] text-black text-xs font-bold rounded-xl whitespace-nowrap">
                          Use
                        </button>
                      )}
                    </div>
                  </div>
                  <select value={form.digitalAccessKind||'paid'} onChange={e => sf('digitalAccessKind',e.target.value)} className={inp}>
                    <option value="paid">Paid digital product</option>
                    <option value="free">Free digital product</option>
                    <option value="trial">Free trial then bill later</option>
                  </select>
                  <input
                    value={form.retailPrice||''}
                    onChange={e => sf('retailPrice',e.target.value)}
                    placeholder={form.digitalAccessKind === 'trial' ? 'Billing price after trial (GHS) *' : form.digitalAccessKind === 'free' ? 'Price becomes 0 automatically' : 'Price (GHS) *'}
                    type="number"
                    disabled={form.digitalAccessKind === 'free'}
                    className={`${inp} ${form.digitalAccessKind === 'free' ? 'bg-gray-50 text-gray-400' : ''}`}
                  />
                  <input value={form.category||'Digital Products'} readOnly className={inp + ' bg-gray-50 text-gray-400'} />
                  {form.digitalAccessKind === 'trial' && (
                    <input
                      value={form.freeTrialDays||'7'}
                      onChange={e => sf('freeTrialDays',e.target.value)}
                      placeholder="Free trial days"
                      type="number"
                      className={inp}
                    />
                  )}
                  <textarea value={form.desc||''} onChange={e => sf('desc',e.target.value)} placeholder="Description" rows={3} className={inp+' resize-none sm:col-span-2'} />
                  <textarea value={form.accessNote||''} onChange={e => sf('accessNote',e.target.value)} placeholder="Access note or purchase guidance (optional)" rows={2} className={inp+' resize-none sm:col-span-2'} />
                  <div ref={digitalModulesSectionRef} className="sm:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Modules / Series Flow</p>
                        <p className="mt-1 text-xs text-gray-500 leading-relaxed max-w-3xl">
                          Build each module as one ordered learning section. Inside a module, mix typed lessons, uploaded files, recorded audio, and recorded video in the exact sequence learners should follow.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!!(form.digitalModules || []).length && (
                          <>
                            <button
                              type="button"
                              onClick={expandAllDigitalModules}
                              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                            >
                              Expand All Modules
                            </button>
                            <button
                              type="button"
                              onClick={collapseAllDigitalModules}
                              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                            >
                              Collapse All Modules
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowDigitalCustomerPreview((current) => !current)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black"
                        >
                          {showDigitalCustomerPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                          {showDigitalCustomerPreview ? 'Hide Customer Preview' : 'Show Customer Preview'}
                        </button>
                        <button
                          type="button"
                          onClick={addDigitalModule}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900"
                        >
                          <Plus size={14} />
                          Add Module / Series
                        </button>
                      </div>
                    </div>

                    {!(form.digitalModules || []).length && (
                      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-[#fcfbf7] px-4 py-3 text-[10px] leading-relaxed text-gray-400">
                        <span>No modules yet.</span>
                        <AdminHoverHint text="Add a module, give it a title and description, then start stacking the typed lesson parts, uploads, and recordings in the order the learner should consume them." />
                      </div>
                    )}

                    {showDigitalCustomerPreview && (
                      <DigitalProductCustomerPreview
                        productName={form.name}
                        accessNote={form.accessNote}
                        modules={form.digitalModules || []}
                        expandedModules={expandedPreviewModules}
                        onToggleModule={togglePreviewModuleExpanded}
                        onExpandAll={expandAllPreviewModules}
                        onCollapseAll={collapseAllPreviewModules}
                      />
                    )}

                    {(form.digitalModules || []).map((module, moduleIndex) => {
                      const moduleKey = getModuleUiKey(module, moduleIndex);
                      const isModuleExpanded = expandedDigitalModules[moduleKey] ?? moduleIndex === 0;
                      const moduleSummary = getDigitalModuleSummary(module);
                      const moduleSectionState = {
                        ...DIGITAL_MODULE_SECTION_DEFAULTS,
                        ...(expandedDigitalModuleSections[moduleKey] || {}),
                      };
                      return (
                      <div
                        key={moduleKey}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => dropModuleAtIndex(moduleIndex)}
                        className="rounded-[26px] border border-gray-200 bg-[#fcfbf7] p-4 space-y-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div
                              className="inline-flex cursor-grab select-none items-center gap-2 rounded-full bg-black px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white active:cursor-grabbing"
                              draggable
                              onDragStart={() => startModuleDrag(moduleIndex)}
                              onDragEnd={() => { draggedModuleRef.current = null; }}
                              title="Drag to reorder module"
                            >
                              <GripVertical size={12} />
                              Module {module.moduleNumber || moduleIndex + 1}
                            </div>
                            <p className="mt-2 text-sm font-extrabold text-black">
                              {module.title || `Untitled Module ${module.moduleNumber || moduleIndex + 1}`}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-gray-600">
                              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                {pluralize(moduleSummary.stepCount, 'step')}
                              </span>
                              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                {pluralize(moduleSummary.textStepCount, 'text lesson')}
                              </span>
                              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                {pluralize(moduleSummary.attachmentStepCount + moduleSummary.inlineAttachmentCount, 'attachment')}
                              </span>
                              {!!moduleSummary.linkCount && (
                                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                  {pluralize(moduleSummary.linkCount, 'link')}
                                </span>
                              )}
                            </div>
                            {!isModuleExpanded && (
                              <p className="mt-3 max-w-3xl text-xs leading-relaxed text-gray-500">
                                {truncatePreviewText(
                                  module.description || 'Open this module to edit its title, description, ordered lesson steps, inline writing blocks, uploads, and recordings.',
                                  220
                                )}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleDigitalModuleExpanded(moduleKey)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                            >
                              {isModuleExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {isModuleExpanded ? 'Close Module' : 'Open Module'}
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDigitalModule(moduleIndex, -1)}
                              disabled={moduleIndex === 0}
                              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-40"
                            >
                              Move Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDigitalModule(moduleIndex, 1)}
                              disabled={moduleIndex === (form.digitalModules || []).length - 1}
                              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-40"
                            >
                              Move Down
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDigitalModule(moduleIndex)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:border-red-300"
                            >
                              <Trash2 size={13} />
                              Remove Module
                            </button>
                          </div>
                        </div>

                        {isModuleExpanded && (
                          <>

                        <div className="space-y-3">
                          <div className="rounded-2xl border border-gray-200 bg-white">
                            <button
                              type="button"
                              onClick={() => toggleDigitalModuleSection(moduleKey, 'details')}
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                            >
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Module Details</p>
                                <p className="mt-1 text-xs text-gray-500">
                                  Title, number, and the short overview learners see for this module.
                                </p>
                              </div>
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-[#fcfbf7] text-gray-600">
                                {moduleSectionState.details ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </span>
                            </button>
                            {moduleSectionState.details && (
                              <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                                <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
                                  <input
                                    value={module.moduleNumber ?? moduleIndex + 1}
                                    readOnly
                                    className={inp + ' bg-gray-50 text-gray-400'}
                                  />
                                  <input
                                    value={module.title || ''}
                                    onChange={e => updateDigitalModule(moduleIndex, 'title', e.target.value)}
                                    placeholder="Module title"
                                    className={inp}
                                  />
                                </div>

                                <textarea
                                  value={module.description || ''}
                                  onChange={e => updateDigitalModule(moduleIndex, 'description', e.target.value)}
                                  placeholder="What this module covers, what outcome the learner should reach, or how this module fits into the full series"
                                  rows={2}
                                  className={inp + ' resize-none'}
                                />
                              </div>
                            )}
                          </div>

                          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="rounded-2xl border border-gray-200 bg-white">
                              <button
                                type="button"
                                onClick={() => toggleDigitalModuleSection(moduleKey, 'textComposer')}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                              >
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Add Lesson Step</p>
                                  <p className="mt-1 text-xs text-gray-500">Open to add one new text lesson step without leaving this module card.</p>
                                </div>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-[#fcfbf7] text-gray-600">
                                  {moduleSectionState.textComposer ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </span>
                              </button>
                              {moduleSectionState.textComposer && (
                                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                                  <p className="text-xs text-gray-500">
                                    Create a written lesson step first when you want text, pronunciation help, images, links, audio, or video to live together inside one teaching step.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => addTextLessonToModule(moduleIndex)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900"
                                  >
                                    <FileText size={14} />
                                    Add Text Lesson
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="rounded-2xl border border-gray-200 bg-white">
                              <button
                                type="button"
                                onClick={() => toggleDigitalModuleSection(moduleKey, 'attachmentComposer')}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                              >
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Add Standalone Attachment Step</p>
                                  <p className="mt-1 text-xs text-gray-500">Open to upload or record the next secure attachment step for this module.</p>
                                </div>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-[#fcfbf7] text-gray-600">
                                  {moduleSectionState.attachmentComposer ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </span>
                              </button>
                              {moduleSectionState.attachmentComposer && (
                                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                                  <p className="text-xs text-gray-500">
                                    Use this when the whole next step should be a document, audio, video, image, workbook, or other secure attachment on its own.
                                  </p>
                                  <ModuleAssetUploader
                                    token={token}
                                    uploadEndpoint="/api/products/upload-digital"
                                    onUploaded={(files) => addFileLessonsToModule(moduleIndex, files)}
                                  />
                                  <ModuleMediaRecorder
                                    token={token}
                                    uploadEndpoint="/api/products/upload-digital"
                                    onRecorded={(files) => addFileLessonsToModule(moduleIndex, files)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {!(module.items || []).length && (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-4 text-xs text-gray-500">
                            No lesson items in this module yet. Add a text lesson, upload an attachment, or record audio, video, or a picture to begin the module flow.
                          </div>
                        )}

                        <div className="space-y-3">
                          {(module.items || []).map((item, itemIndex) => {
                            const itemKey = getModuleItemUiKey(item, moduleKey, itemIndex);
                            const isItemExpanded = expandedDigitalModuleItems[itemKey] ?? false;
                            const itemBlocks = Array.isArray(item.blocks) ? item.blocks : [];
                            const itemLinkCount = itemBlocks.filter((block) => block.kind === 'link').length;
                            const itemAttachmentCount = itemBlocks.filter((block) => block.kind === 'file').length;
                            return (
                            <div
                              id={`digital-module-item-${itemKey}`}
                              key={itemKey}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => dropModuleItemAtIndex(moduleIndex, itemIndex)}
                              className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-black px-2 text-xs font-extrabold text-white">
                                    {item.order || itemIndex + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className="inline-flex cursor-grab select-none items-center gap-1 rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-bold text-gray-500 active:cursor-grabbing"
                                        draggable
                                        onDragStart={() => startModuleItemDrag(moduleIndex, itemIndex)}
                                        onDragEnd={() => { draggedModuleItemRef.current = null; }}
                                        title="Drag to reorder lesson step"
                                      >
                                        <GripVertical size={12} />
                                        Module {module.moduleNumber || moduleIndex + 1} / Step {item.order || itemIndex + 1}
                                      </span>
                                      <p className="text-sm font-extrabold text-black">
                                        {item.title || (item.kind === 'file' ? item.originalFilename || 'Attachment step' : `Lesson Step ${item.order || itemIndex + 1}`)}
                                      </p>
                                      <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-bold capitalize text-gray-600">
                                        {item.kind === 'file' ? `${item.fileKind || 'file'} item` : 'text item'}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                      {item.kind === 'file'
                                        ? 'Standalone secure attachment step'
                                        : `${(item.blocks || []).length} inline block${(item.blocks || []).length === 1 ? '' : 's'} inside this lesson step`}
                                    </p>
                                    {!isItemExpanded && (
                                      <>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-gray-600">
                                          {item.kind === 'text' && (
                                            <>
                                              <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                                {pluralize(itemBlocks.length, 'block')}
                                              </span>
                                              {!!itemAttachmentCount && (
                                                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                                  {pluralize(itemAttachmentCount, 'attachment')}
                                                </span>
                                              )}
                                              {!!itemLinkCount && (
                                                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                                  {pluralize(itemLinkCount, 'link')}
                                                </span>
                                              )}
                                            </>
                                          )}
                                          {item.kind === 'file' && item.bytes > 0 && (
                                            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                              {formatBytes(item.bytes)}
                                            </span>
                                          )}
                                        </div>
                                        {!!(item.description || item.content) && (
                                          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-gray-500">
                                            {truncatePreviewText(item.description || item.content, 180)}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleDigitalModuleItemExpanded(itemKey)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                                  >
                                    {isItemExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    {isItemExpanded ? 'Close Step' : 'Open Step'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveModuleItem(moduleIndex, itemIndex, -1)}
                                    disabled={itemIndex === 0}
                                    className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-40"
                                  >
                                    Move Up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveModuleItem(moduleIndex, itemIndex, 1)}
                                    disabled={itemIndex === (module.items || []).length - 1}
                                    className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-40"
                                  >
                                    Move Down
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeModuleItem(moduleIndex, itemIndex)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:border-red-300"
                                  >
                                    <Trash2 size={13} />
                                    Remove
                                  </button>
                                </div>
                              </div>

                              {isItemExpanded && (
                                <>
                              {item.kind === 'file' && (
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Attachment Title</p>
                              )}
                              <input
                                value={item.title || ''}
                                onChange={e => updateModuleItem(moduleIndex, itemIndex, 'title', e.target.value)}
                                placeholder={item.kind === 'file' ? 'Attachment or recording title' : 'Text lesson title'}
                                className={inp}
                              />

                              {item.kind === 'file' && (
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Attachment Description</p>
                              )}
                              <textarea
                                value={item.description || ''}
                                onChange={e => updateModuleItem(moduleIndex, itemIndex, 'description', e.target.value)}
                                placeholder={item.kind === 'file'
                                  ? 'Describe exactly what this upload or recording is about for the learner'
                                  : 'Short learner-facing description for this step'}
                                rows={2}
                                className={inp + ' resize-none'}
                              />

                              {item.kind === 'text' ? (
                                <div className="space-y-4">
                                  <div className="rounded-2xl border border-gray-200 bg-[#fcfbf7] p-4 space-y-3">
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Inline Lesson Blocks</p>
                                      <p className="mt-1 text-xs text-gray-500">Build this one lesson step with writing, links, uploaded files, recorded audio, recorded video, or captured pictures in the exact order the learner should follow.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => addTextBlockToLesson(moduleIndex, itemIndex)}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-900"
                                      >
                                        <FileText size={14} />
                                        Write
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => addLinkBlockToLesson(moduleIndex, itemIndex)}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-black hover:text-black"
                                      >
                                        <Link2 size={14} />
                                        Add Link
                                      </button>
                                      <ModuleAssetUploader
                                        token={token}
                                        uploadEndpoint="/api/products/upload-digital"
                                        variant="inline"
                                        buttonLabel="Upload Attachment"
                                        onUploaded={(files) => addFileBlocksToTextLesson(moduleIndex, itemIndex, files)}
                                      />
                                    </div>
                                    <ModuleMediaRecorder
                                      token={token}
                                      uploadEndpoint="/api/products/upload-digital"
                                      variant="inline"
                                      onRecorded={(files) => addFileBlocksToTextLesson(moduleIndex, itemIndex, files)}
                                    />
                                  </div>

                                  {!(item.blocks || []).length && (
                                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-4 text-xs text-gray-500">
                                      No inline blocks in this lesson yet. Add writing, a link, an upload, recorded audio, recorded video, or a picture.
                                    </div>
                                  )}

                                  <div className="space-y-3">
                                    {(item.blocks || []).map((block, blockIndex) => {
                                      const textBlockKey = String(block.clientKey || block.blockId || block._id || `${moduleIndex}-${itemIndex}-${blockIndex}`);
                                      const writingBlockPresentation = normalizeDigitalWritingBlockPresentationForForm(block.presentation || {});
                                      const writingBlockTitleLines = parseDigitalWritingBlockTitleLines(block.title || '');
                                      const writingBlockLessonNumber = resolveDigitalWritingBlockLessonNumber(item.blocks || [], blockIndex);
                                      const isWritingBlockExpanded = expandedDigitalWritingBlocks[textBlockKey] ?? true;
                                      const writingBlockTitleEditorVisible = block.kind === 'text'
                                        && (visibleDigitalWritingBlockTitles[textBlockKey] ?? (writingBlockTitleLines.length > 0 || !!String(block.description || '').trim()));
                                      const writingBlockPreviewStyle = buildDigitalWritingBlockInlineStyle(writingBlockPresentation);
                                      const writingBlockTitleStyle = buildDigitalWritingBlockTitleInlineStyle(writingBlockPresentation);
                                      const writingBlockSubtitleStyle = buildDigitalWritingBlockSubtitleInlineStyle(writingBlockPresentation);
                                      const writingBlockEditorStyle = buildDigitalWritingBlockInlineStyle(writingBlockPresentation, { includeHighlight: false });
                                      const collapsedWritingPreview = block.kind === 'text'
                                        ? truncatePreviewText(stripRichTextHtmlToPlainText(block.contentHtml || '') || block.content || block.description || block.title || 'Open this writing block to keep editing the lesson copy.', 160)
                                        : block.kind === 'link'
                                          ? truncatePreviewText(block.description || block.url || 'Open this link block to keep editing the reference details.', 160)
                                          : truncatePreviewText(block.description || block.originalFilename || 'Open this attachment block to keep editing the file details.', 160);

                                      return (
                                      <div
                                        key={textBlockKey}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={() => dropLessonBlockAtIndex(moduleIndex, itemIndex, blockIndex)}
                                        className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3"
                                      >
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                          <div className="flex items-start gap-3 min-w-0">
                                            <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-black px-1.5 text-[11px] font-extrabold text-white">
                                              {block.order || blockIndex + 1}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                  className="inline-flex cursor-grab select-none items-center gap-1 rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-bold text-gray-500 active:cursor-grabbing"
                                                  draggable
                                                  onDragStart={() => startLessonBlockDrag(moduleIndex, itemIndex, blockIndex)}
                                                  onDragEnd={() => { draggedLessonBlockRef.current = null; }}
                                                  title="Drag to reorder block"
                                                >
                                                  <GripVertical size={12} />
                                                  Block {block.order || blockIndex + 1}
                                                </span>
                                                <p className="text-sm font-extrabold text-black">
                                                  {block.kind === 'text'
                                                    ? `Writing Block ${block.order || blockIndex + 1}`
                                                    : block.kind === 'link'
                                                      ? (block.title || `Link Block ${block.order || blockIndex + 1}`)
                                                      : (block.title || block.originalFilename || `Attachment Block ${block.order || blockIndex + 1}`)}
                                                </p>
                                                <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-bold capitalize text-gray-600">
                                                  {block.kind === 'file' ? `${block.fileKind || 'file'} attachment` : block.kind}
                                                </span>
                                              </div>
                                              <p className="mt-1 text-xs text-gray-500">
                                                {block.kind === 'text'
                                                  ? 'Type the written explanation, notes, or instructions for this part.'
                                                  : block.kind === 'link'
                                                    ? 'Share a helpful reference link, practice page, or outside resource.'
                                                    : 'Inline secure attachment for this same lesson step.'}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              onClick={() => toggleDigitalWritingBlockExpanded(textBlockKey)}
                                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                                            >
                                              {isWritingBlockExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                              {isWritingBlockExpanded ? 'Fold Block' : 'Open Block'}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => moveTextLessonBlock(moduleIndex, itemIndex, blockIndex, -1)}
                                              disabled={blockIndex === 0}
                                              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-40"
                                            >
                                              Move Up
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => moveTextLessonBlock(moduleIndex, itemIndex, blockIndex, 1)}
                                              disabled={blockIndex === (item.blocks || []).length - 1}
                                              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-40"
                                            >
                                              Move Down
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => removeTextLessonBlock(moduleIndex, itemIndex, blockIndex)}
                                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700 hover:border-red-300"
                                            >
                                              <Trash2 size={13} />
                                              Remove
                                            </button>
                                          </div>
                                        </div>

                                        {!isWritingBlockExpanded ? (
                                          <div className="rounded-2xl border border-dashed border-gray-200 bg-[#fcfbf7] px-3 py-2 text-xs leading-relaxed text-gray-500">
                                            {collapsedWritingPreview}
                                          </div>
                                        ) : block.kind === 'text' ? (
                                          <div className="space-y-3">
                                            <div className="rounded-2xl border border-[#efe4bf] bg-[#fffaf0] p-3 space-y-3">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (writingBlockTitleEditorVisible) {
                                                      updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'title', '');
                                                      updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'description', '');
                                                      toggleDigitalWritingBlockTitleEditor(textBlockKey, false);
                                                      return;
                                                    }
                                                    toggleDigitalWritingBlockTitleEditor(textBlockKey, true);
                                                  }}
                                                  className={`inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-[11px] font-bold transition-colors ${
                                                    writingBlockTitleEditorVisible
                                                      ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300'
                                                      : 'border-gray-200 bg-white text-gray-700 hover:border-black hover:text-black'
                                                  }`}
                                                >
                                                  {writingBlockTitleEditorVisible ? 'Remove Title / Subtitle' : 'Add Title / Subtitle'}
                                                </button>
                                                <select
                                                  value={writingBlockPresentation.labelMode}
                                                  onChange={(event) => updateTextLessonBlockPresentation(moduleIndex, itemIndex, blockIndex, 'labelMode', event.target.value)}
                                                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 outline-none focus:border-black"
                                                >
                                                  {DIGITAL_WRITING_BLOCK_LABEL_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                  ))}
                                                </select>
                                                <div className="inline-flex items-center gap-1.5">
                                                  <span className="rounded-2xl border border-dashed border-gray-200 bg-white px-3 py-1 text-[10px] font-medium text-gray-400">
                                                    Selected text only
                                                  </span>
                                                  <AdminHoverHint text="Highlight the words you want to change, then use the writing tools above the editor." />
                                                </div>
                                              </div>

                                              {writingBlockTitleEditorVisible && (
                                                <div className="space-y-3">
                                                  <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Title</p>
                                                      <textarea
                                                        value={block.title || ''}
                                                        onChange={(event) => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'title', event.target.value)}
                                                        placeholder={'Add one or more title lines for this writing block.\nUse a new line for each title.'}
                                                        rows={2}
                                                        className={inp + ' resize-y'}
                                                      />
                                                    </div>
                                                    <div className="space-y-1">
                                                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Subtitle / Description</p>
                                                      <textarea
                                                        value={block.description || ''}
                                                        onChange={(event) => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'description', event.target.value)}
                                                        placeholder={'Add a subtitle or short description for this writing block.\nThis can also appear under the title in the contents page.'}
                                                        rows={2}
                                                        className={inp + ' resize-y'}
                                                      />
                                                    </div>
                                                  </div>
                                                  <div className="grid gap-3 xl:grid-cols-2">
                                                    <WritingBlockTextStyleToolbar
                                                      label="Title Styling"
                                                      value={writingBlockPresentation.titleStyle}
                                                      onChange={(key, value) => updateTextLessonBlockPresentationStyle(moduleIndex, itemIndex, blockIndex, 'titleStyle', key, value)}
                                                      onToggleFormat={(formatKey) => toggleTextLessonBlockPresentationStyleFormat(moduleIndex, itemIndex, blockIndex, 'titleStyle', formatKey)}
                                                    />
                                                    <WritingBlockTextStyleToolbar
                                                      label="Subtitle Styling"
                                                      value={writingBlockPresentation.subtitleStyle}
                                                      onChange={(key, value) => updateTextLessonBlockPresentationStyle(moduleIndex, itemIndex, blockIndex, 'subtitleStyle', key, value)}
                                                      onToggleFormat={(formatKey) => toggleTextLessonBlockPresentationStyleFormat(moduleIndex, itemIndex, blockIndex, 'subtitleStyle', formatKey)}
                                                    />
                                                  </div>
                                                </div>
                                              )}

                                              <div className="rounded-2xl border border-[#f0e7cf] bg-white px-4 py-3">
                                                {writingBlockPresentation.labelMode === 'lesson' && (
                                                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a7a00]">
                                                    LESSON {writingBlockLessonNumber}
                                                  </p>
                                                )}
                                                {!!writingBlockTitleLines.length && (
                                                  <div className="space-y-1">
                                                    {writingBlockTitleLines.map((titleLine, titleLineIndex) => (
                                                      <p
                                                        key={`${textBlockKey}-title-line-${titleLineIndex}`}
                                                        className="break-words font-extrabold"
                                                        style={writingBlockTitleStyle}
                                                      >
                                                        {titleLine}
                                                      </p>
                                                    ))}
                                                  </div>
                                                )}
                                                {!!String(block.description || '').trim() && (
                                                  <p
                                                    className="mt-2 whitespace-pre-line break-words leading-relaxed"
                                                    style={writingBlockSubtitleStyle}
                                                  >
                                                    {block.description}
                                                  </p>
                                                )}
                                                {block.contentHtml ? (
                                                  <div
                                                    className="mt-3 break-words rounded-2xl px-3 py-2 leading-relaxed"
                                                    style={writingBlockPreviewStyle}
                                                    dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(block.contentHtml) }}
                                                  />
                                                ) : (
                                                  <p
                                                    className="mt-3 whitespace-pre-line break-words rounded-2xl px-3 py-2 leading-relaxed"
                                                    style={writingBlockPreviewStyle}
                                                  >
                                                    {block.content || 'Writing preview will appear here as you type.'}
                                                  </p>
                                                )}
                                              </div>
                                            </div>

                                            <RichTextEditor
                                              value={block.contentHtml || ''}
                                              plainTextValue={block.content || ''}
                                              onChange={(payload) => updateTextLessonBlockRichContent(moduleIndex, itemIndex, blockIndex, payload)}
                                              editorStyle={writingBlockEditorStyle}
                                              placeholder={'Type the lesson text for this block.\nUse blank lines for paragraphs.\nUse separate blocks when you want the learner to stop and watch, listen, or open something between written parts.'}
                                            />
                                            <div
                                              className="rounded-2xl border border-dashed border-gray-200 bg-white px-3 py-1 text-[10px] leading-relaxed text-gray-400"
                                              style={writingBlockEditorStyle}
                                            >
                                              Select text above to format it.
                                            </div>
                                          </div>
                                        ) : block.kind === 'link' ? (
                                          <div className="space-y-3">
                                            <input
                                              value={block.title || ''}
                                              onChange={e => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'title', e.target.value)}
                                              placeholder="Link title"
                                              className={inp}
                                            />
                                            <input
                                              value={block.url || ''}
                                              onChange={e => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'url', e.target.value)}
                                              placeholder="https://example.com"
                                              className={inp}
                                            />
                                            <textarea
                                              value={block.description || ''}
                                              onChange={e => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'description', e.target.value)}
                                              placeholder="Optional note telling the learner why this link matters here"
                                              rows={2}
                                              className={inp + ' resize-none'}
                                            />
                                            <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-600">
                                              <input
                                                type="checkbox"
                                                checked={block.openInNewTab !== false}
                                                onChange={e => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'openInNewTab', e.target.checked)}
                                                className="h-4 w-4 accent-black"
                                              />
                                              Open in a new tab
                                            </label>
                                          </div>
                                        ) : (
                                          <div className="space-y-3">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Attachment Title</p>
                                            <input
                                              value={block.title || ''}
                                              onChange={e => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'title', e.target.value)}
                                              placeholder="Attachment or recording title"
                                              className={inp}
                                            />
                                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Attachment Description</p>
                                            <textarea
                                              value={block.description || ''}
                                              onChange={e => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'description', e.target.value)}
                                              placeholder="Describe what this upload or recording is about and what the learner should use it for"
                                              rows={2}
                                              className={inp + ' resize-none'}
                                            />
                                            <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-600">
                                              <input
                                                type="checkbox"
                                                checked={!!block.allowDownload}
                                                onChange={e => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'allowDownload', e.target.checked)}
                                                disabled={!isPreviewableModuleFile(block.fileKind)}
                                                className="h-4 w-4 accent-black"
                                              />
                                              {isPreviewableModuleFile(block.fileKind) ? 'Allow learner download' : 'Download required for this file type'}
                                            </label>
                                            {isImageModuleFile(block.fileKind) && (
                                              <div className="rounded-2xl border border-gray-200 bg-[#fcfbf7] px-3 py-3 space-y-2">
                                                <p className="text-[11px] font-bold text-gray-700">Image protection</p>
                                                <p className="text-[11px] leading-relaxed text-gray-500">
                                                  {block.allowDownload
                                                    ? 'This image can be downloaded. Turn on watermarking if the learner copy should carry your name or context.'
                                                    : 'Leave download off to keep this image strictly protected inside the library.'}
                                                </p>
                                                <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-600">
                                                  <input
                                                    type="checkbox"
                                                    checked={!!block.watermarkEnabled}
                                                    onChange={e => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'watermarkEnabled', e.target.checked)}
                                                    disabled={!block.allowDownload}
                                                    className="h-4 w-4 accent-black"
                                                  />
                                                  Watermark learner copy
                                                </label>
                                                {block.allowDownload && block.watermarkEnabled && (
                                                  <input
                                                    value={block.watermarkText || ''}
                                                    onChange={e => updateTextLessonBlock(moduleIndex, itemIndex, blockIndex, 'watermarkText', e.target.value)}
                                                    placeholder="Watermark text, e.g. Belle Kreyashon Student Copy"
                                                    className={inp}
                                                  />
                                                )}
                                              </div>
                                            )}
                                            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                              {block.originalFilename && (
                                                <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                                  {block.originalFilename}
                                                </span>
                                              )}
                                              {block.fileKind && (
                                                <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1 capitalize">
                                                  {block.fileKind}
                                                </span>
                                              )}
                                              {block.bytes > 0 && (
                                                <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                                  {formatBytes(block.bytes)}
                                                </span>
                                              )}
                                              <span className={`rounded-full border px-2.5 py-1 ${
                                                block.allowDownload
                                                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                                  : 'border-amber-100 bg-amber-50 text-amber-700'
                                              }`}>
                                                {block.allowDownload ? 'Download enabled' : 'Strictly protected'}
                                              </span>
                                              {isImageModuleFile(block.fileKind) && block.allowDownload && block.watermarkEnabled && !!String(block.watermarkText || '').trim() && (
                                                <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-sky-700">
                                                  Watermarked learner copy
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )})}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={!!item.allowDownload}
                                      onChange={e => updateModuleItem(moduleIndex, itemIndex, 'allowDownload', e.target.checked)}
                                      disabled={!isPreviewableModuleFile(item.fileKind)}
                                      className="h-4 w-4 accent-black"
                                    />
                                    {isPreviewableModuleFile(item.fileKind) ? 'Allow learner download' : 'Download required for this file type'}
                                  </label>
                                  {isImageModuleFile(item.fileKind) && (
                                    <div className="rounded-2xl border border-gray-200 bg-[#fcfbf7] px-3 py-3 space-y-2">
                                      <p className="text-[11px] font-bold text-gray-700">Image protection</p>
                                      <p className="text-[11px] leading-relaxed text-gray-500">
                                        {item.allowDownload
                                          ? 'This image can be downloaded. Turn on watermarking if the learner copy should carry your name or context.'
                                          : 'Leave download off to keep this image strictly protected inside the library.'}
                                      </p>
                                      <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-600">
                                        <input
                                          type="checkbox"
                                          checked={!!item.watermarkEnabled}
                                          onChange={e => updateModuleItem(moduleIndex, itemIndex, 'watermarkEnabled', e.target.checked)}
                                          disabled={!item.allowDownload}
                                          className="h-4 w-4 accent-black"
                                        />
                                        Watermark learner copy
                                      </label>
                                      {item.allowDownload && item.watermarkEnabled && (
                                        <input
                                          value={item.watermarkText || ''}
                                          onChange={e => updateModuleItem(moduleIndex, itemIndex, 'watermarkText', e.target.value)}
                                          placeholder="Watermark text, e.g. Belle Kreyashon Student Copy"
                                          className={inp}
                                        />
                                      )}
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                    {item.originalFilename && (
                                      <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                        {item.originalFilename}
                                      </span>
                                    )}
                                    {item.fileKind && (
                                      <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1 capitalize">
                                        {item.fileKind}
                                      </span>
                                    )}
                                    {item.bytes > 0 && (
                                      <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                        {formatBytes(item.bytes)}
                                      </span>
                                    )}
                                    <span className={`rounded-full border px-2.5 py-1 ${
                                      item.allowDownload
                                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                        : 'border-amber-100 bg-amber-50 text-amber-700'
                                    }`}>
                                      {item.allowDownload ? 'Download enabled' : 'Strictly protected'}
                                    </span>
                                    {isImageModuleFile(item.fileKind) && item.allowDownload && item.watermarkEnabled && !!String(item.watermarkText || '').trim() && (
                                      <span className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-sky-700">
                                        Watermarked learner copy
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                                </>
                              )}
                            </div>
                            );
                          })}
                        </div>
                          </>
                        )}
                      </div>
                    );
                    })}

                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                      Learners will see these module cards one by one in the digital library. Step numbering restarts inside each module, the order you drag or move here becomes the exact learning progression, and learners can resume from the last lesson item and sentence marker they saved.
                    </div>
                  </div>
                  <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-[#fcfbf7] p-4 space-y-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Learning Filters</p>
                      <p className="mt-1 text-xs text-gray-500">These settings feed the public digital-product filters so learners can find the right course, guide or bundle quickly.</p>
                    </div>
                    <div className="grid gap-3 xl:grid-cols-3">
                      <div className="space-y-2">
                        <select value={form.digitalSkillLevel||'all-levels'} onChange={e => sf('digitalSkillLevel', e.target.value)} className={inp}>
                          {digitalSkillLevelOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input
                            value={customDigitalInputs.digitalSkillLevel}
                            onChange={e => setCustomDigitalInput('digitalSkillLevel', e.target.value)}
                            placeholder="Add a new skill level"
                            className={inp + ' flex-1'}
                          />
                          {customDigitalInputs.digitalSkillLevel.trim() && (
                            <button type="button" onClick={() => applyCustomDigitalSingleValue('digitalSkillLevel')} className="px-3 py-2 bg-[#FDC700] text-black text-xs font-bold rounded-xl whitespace-nowrap">
                              Use
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <select value={form.digitalFormat||''} onChange={e => sf('digitalFormat', e.target.value)} className={inp}>
                          <option value="">Choose format</option>
                          {digitalFormatOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input
                            value={customDigitalInputs.digitalFormat}
                            onChange={e => setCustomDigitalInput('digitalFormat', e.target.value)}
                            placeholder="Add a new format"
                            className={inp + ' flex-1'}
                          />
                          {customDigitalInputs.digitalFormat.trim() && (
                            <button type="button" onClick={() => applyCustomDigitalSingleValue('digitalFormat')} className="px-3 py-2 bg-[#FDC700] text-black text-xs font-bold rounded-xl whitespace-nowrap">
                              Use
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <select value={form.digitalDuration||''} onChange={e => sf('digitalDuration', e.target.value)} className={inp}>
                          <option value="">Choose duration</option>
                          {digitalDurationOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input
                            value={customDigitalInputs.digitalDuration}
                            onChange={e => setCustomDigitalInput('digitalDuration', e.target.value)}
                            placeholder="Add a new duration"
                            className={inp + ' flex-1'}
                          />
                          {customDigitalInputs.digitalDuration.trim() && (
                            <button type="button" onClick={() => applyCustomDigitalSingleValue('digitalDuration')} className="px-3 py-2 bg-[#FDC700] text-black text-xs font-bold rounded-xl whitespace-nowrap">
                              Use
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Topic / Subject</p>
                      <div className="flex flex-wrap gap-2">
                        {digitalTopicOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleFormArrayValue('digitalTopics', option.value)}
                            className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                              form.digitalTopics?.includes(option.value)
                                ? 'border-black bg-black text-white'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-black'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={customDigitalInputs.digitalTopic}
                          onChange={e => setCustomDigitalInput('digitalTopic', e.target.value)}
                          placeholder="Add a new topic"
                          className={inp + ' flex-1'}
                        />
                        {customDigitalInputs.digitalTopic.trim() && (
                          <button type="button" onClick={() => addCustomDigitalArrayValue('digitalTopics', 'digitalTopic')} className="px-3 py-2 bg-[#FDC700] text-black text-xs font-bold rounded-xl whitespace-nowrap">
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Inclusions</p>
                      <div className="flex flex-wrap gap-2">
                        {digitalInclusionOptions.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleFormArrayValue('digitalInclusions', option.value)}
                            className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-all ${
                              form.digitalInclusions?.includes(option.value)
                                ? 'border-black bg-black text-white'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-black'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={customDigitalInputs.digitalInclusion}
                          onChange={e => setCustomDigitalInput('digitalInclusion', e.target.value)}
                          placeholder="Add a new inclusion"
                          className={inp + ' flex-1'}
                        />
                        {customDigitalInputs.digitalInclusion.trim() && (
                          <button type="button" onClick={() => addCustomDigitalArrayValue('digitalInclusions', 'digitalInclusion')} className="px-3 py-2 bg-[#FDC700] text-black text-xs font-bold rounded-xl whitespace-nowrap">
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <label className="sm:col-span-2 flex items-start gap-2 text-sm font-bold cursor-pointer p-3 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      checked={!!form.isSeries}
                      onChange={e => sf('isSeries', e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-black"
                    />
                    <span>
                      Arrange this digital product as a step-by-step series
                      <span className="block text-xs font-normal text-gray-400 mt-0.5">
                        Useful for classes, lessons, modules, or guided bundles where files should be consumed in order.
                      </span>
                    </span>
                  </label>
                  {form.isSeries && (
                    <>
                      <input value={form.seriesTitle||''} onChange={e => sf('seriesTitle',e.target.value)} placeholder="Series title (optional)" className={inp} />
                      <input value={form.seriesDescription||''} onChange={e => sf('seriesDescription',e.target.value)} placeholder="Series subtitle or overview (optional)" className={inp} />
                    </>
                  )}
                  <label className="sm:col-span-2 flex items-start gap-2 text-sm font-bold cursor-pointer p-3 bg-gray-50 rounded-xl">
                    <input
                      type="checkbox"
                      checked={!!form.isCertified}
                      onChange={e => sf('isCertified', e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-black"
                    />
                    <span>
                      This digital product issues a certificate after completion
                      <span className="block text-xs font-normal text-gray-400 mt-0.5">
                        Learners must open the modules and mark each one complete before they can request their certificate from the library.
                      </span>
                    </span>
                  </label>
                  {form.isCertified && (
                    <>
                      <input value={form.certificateTitle||''} onChange={e => sf('certificateTitle',e.target.value)} placeholder="Certificate title" className={inp} />
                      <input value={form.certificateDescription||''} onChange={e => sf('certificateDescription',e.target.value)} placeholder="Completion note shown to learners" className={inp} />
                    </>
                  )}
                  <div className="sm:col-span-2 space-y-3">
                    <input value={form.supportEmail||''} onChange={e => sf('supportEmail',e.target.value)} placeholder="Trainer / tutor support email" className={inp} />
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <p className="text-[10px] leading-relaxed text-gray-400">Shown to learners in the library.</p>
                      <AdminHoverHint text="Learners will see this inside the digital library and secure viewer when they need help with lessons or modules." />
                    </div>
                  </div>
                  <div className="sm:col-span-2 space-y-3">
                    <input value={form.supportWhatsApp||''} onChange={e => sf('supportWhatsApp',e.target.value)} placeholder="Trainer / tutor WhatsApp (optional)" className={inp} />
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <p className="text-[10px] leading-relaxed text-gray-400">Optional quick support line.</p>
                      <AdminHoverHint text="Example: `0594038888` or `+233594038888`." />
                    </div>
                  </div>
                  <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-[#fcfbf7] p-4 space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Table of Contents Page</p>
                        <div className="mt-1 flex flex-wrap items-start gap-2">
                          <p className="text-[10px] leading-relaxed text-gray-400">
                            Generated from your modules and lessons.
                          </p>
                          <AdminHoverHint
                            text="This page is generated from module titles, lesson titles, and their subtitles. Learners can open it in the library and tap any entry to jump straight to the right lesson."
                            align="right"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={scrollToDigitalModulesEditor}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                      >
                        <Pencil size={13} />
                        Edit Content
                      </button>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <input
                              value={digitalContentsPagePreview.title}
                              onChange={(event) => updateDigitalContentsPageField('title', event.target.value)}
                              placeholder="Contents page title"
                              className={inp}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              value={digitalContentsPagePreview.subtitle}
                              onChange={(event) => updateDigitalContentsPageField('subtitle', event.target.value)}
                              placeholder="Contents page subtitle"
                              className={inp}
                            />
                          </div>
                        </div>

                        {[
                          ['titleStyle', 'Title Styling'],
                          ['subtitleStyle', 'Subtitle Styling'],
                        ].map(([styleKey, label]) => {
                          const styleValue = digitalContentsPagePreview[styleKey] || DEFAULT_DIGITAL_CONTENTS_TITLE_STYLE;
                          return (
                            <div key={styleKey} className="rounded-2xl border border-gray-200 bg-white p-4">
                              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{label}</p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="space-y-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Font color</span>
                                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                                    <input
                                      value={styleValue.color || '#111827'}
                                      onChange={(event) => updateDigitalContentsPageStyle(styleKey, 'color', event.target.value)}
                                      type="color"
                                      className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                                    />
                                    <span className="text-xs font-bold text-gray-600">{styleValue.color || '#111827'}</span>
                                  </div>
                                </label>
                                <label className="space-y-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Font size</span>
                                  <input
                                    value={styleValue.fontSize || 16}
                                    onChange={(event) => updateDigitalContentsPageStyle(styleKey, 'fontSize', event.target.value)}
                                    type="number"
                                    min="12"
                                    max="64"
                                    className={inp}
                                  />
                                </label>
                                <label className="space-y-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Font family</span>
                                  <select
                                    value={styleValue.fontFamily || 'Arial, sans-serif'}
                                    onChange={(event) => updateDigitalContentsPageStyle(styleKey, 'fontFamily', event.target.value)}
                                    className={inp}
                                  >
                                    {DIGITAL_CONTENTS_FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </select>
                                </label>
                                <label className="space-y-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Font weight</span>
                                  <select
                                    value={styleValue.fontWeight || '500'}
                                    onChange={(event) => updateDigitalContentsPageStyle(styleKey, 'fontWeight', event.target.value)}
                                    className={inp}
                                  >
                                    {DIGITAL_CONTENTS_WEIGHT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </select>
                                </label>
                                <label className="space-y-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Font style</span>
                                  <select
                                    value={styleValue.fontStyle || 'normal'}
                                    onChange={(event) => updateDigitalContentsPageStyle(styleKey, 'fontStyle', event.target.value)}
                                    className={inp}
                                  >
                                    {DIGITAL_CONTENTS_FONT_STYLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </select>
                                </label>
                                <label className="space-y-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Text format</span>
                                  <select
                                    value={styleValue.textTransform || 'none'}
                                    onChange={(event) => updateDigitalContentsPageStyle(styleKey, 'textTransform', event.target.value)}
                                    className={inp}
                                  >
                                    {DIGITAL_CONTENTS_TEXT_TRANSFORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </select>
                                </label>
                                <label className="space-y-2 sm:col-span-2">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Decoration</span>
                                  <select
                                    value={styleValue.textDecoration || 'none'}
                                    onChange={(event) => updateDigitalContentsPageStyle(styleKey, 'textDecoration', event.target.value)}
                                    className={inp}
                                  >
                                    {DIGITAL_CONTENTS_TEXT_DECORATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </select>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,_#ffffff_0%,_#f7f3ea_100%)] p-4 shadow-[0_18px_40px_rgba(17,24,39,0.08)]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9a7a00]">Live Contents Preview</p>
                            <p className="mt-1 text-[10px] leading-relaxed text-gray-400">Fold the list or open modules one at a time while you review the generated order.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDigitalContentsPreviewEntries((current) => !current)}
                            className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                          >
                            {showDigitalContentsPreviewEntries ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {showDigitalContentsPreviewEntries ? 'Fold Content' : 'Open Content'}
                          </button>
                        </div>
                        <div className="mt-3 rounded-[20px] border border-white/80 bg-white/90 p-4">
                          <p style={buildDigitalContentsInlineStyle(digitalContentsPagePreview.titleStyle, DEFAULT_DIGITAL_CONTENTS_TITLE_STYLE)}>
                            {digitalContentsPagePreview.title}
                          </p>
                          <p className="mt-2 leading-relaxed" style={buildDigitalContentsInlineStyle(digitalContentsPagePreview.subtitleStyle, DEFAULT_DIGITAL_CONTENTS_SUBTITLE_STYLE)}>
                            {digitalContentsPagePreview.subtitle}
                          </p>

                          {(form.digitalModules || []).length ? (
                            <>
                              {!showDigitalContentsPreviewEntries && (
                                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-gray-600">
                                  <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                    {pluralize((form.digitalModules || []).length, 'module')}
                                  </span>
                                  <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                    {pluralize(
                                      (form.digitalModules || []).reduce((sum, module) => (
                                        sum + getDigitalContentsModuleEntryCounts(module).lessons
                                      ), 0),
                                      'lesson'
                                    )}
                                  </span>
                                  <span className="rounded-full border border-gray-200 bg-[#fcfbf7] px-2.5 py-1">
                                    {pluralize(
                                      (form.digitalModules || []).reduce((sum, module) => (
                                        sum + getDigitalContentsModuleEntryCounts(module).writingBlocks
                                      ), 0),
                                      'writing title'
                                    )}
                                  </span>
                                </div>
                              )}
                              {showDigitalContentsPreviewEntries && (
                                <div className="mt-4 space-y-3">
                                  {(form.digitalModules || []).map((module, moduleIndex) => {
                                    const moduleKey = getModuleUiKey(module, moduleIndex);
                                    const isModuleExpanded = expandedDigitalContentsPreviewModules[moduleKey] ?? moduleIndex === 0;
                                    const moduleCounts = getDigitalContentsModuleEntryCounts(module);
                                    return (
                                      <div key={module.clientKey || module._id || `contents-preview-module-${moduleIndex}`} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                          <div className="flex min-w-0 items-start gap-3">
                                            <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-black px-2 text-[11px] font-extrabold text-white">
                                              {module.moduleNumber || moduleIndex + 1}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-extrabold text-black">
                                                {module.title || `Module ${module.moduleNumber || moduleIndex + 1}`}
                                              </p>
                                              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-gray-500">
                                                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                                  {pluralize(moduleCounts.lessons, 'lesson')}
                                                </span>
                                                {!!moduleCounts.writingBlocks && (
                                                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1">
                                                    {pluralize(moduleCounts.writingBlocks, 'writing title')}
                                                  </span>
                                                )}
                                              </div>
                                              {!isModuleExpanded && (
                                                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                                                  {moduleCounts.totalEntries
                                                    ? `${pluralize(moduleCounts.totalEntries, 'contents entry')} hidden in this module preview.`
                                                    : 'No lesson entries added yet.'}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => toggleDigitalContentsPreviewModuleExpanded(moduleKey)}
                                            className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 hover:border-black hover:text-black"
                                          >
                                            {isModuleExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {isModuleExpanded ? 'Fold Module' : 'Open Module'}
                                          </button>
                                        </div>
                                        {isModuleExpanded && (
                                          <div className="mt-3 space-y-2">
                                            {(module.items || []).map((item, itemIndex) => {
                                          const contentsWritingBlocks = buildDigitalContentsWritingBlockEntries(item);
                                          return (
                                            <div key={item.clientKey || item._id || `contents-preview-item-${moduleIndex}-${itemIndex}`} className="rounded-xl border border-gray-100 bg-white px-3 py-2.5">
                                              <p className="text-xs font-bold text-gray-800">
                                                {item.order || itemIndex + 1}. {item.title || (item.kind === 'file' ? item.originalFilename || 'Attachment' : `Text Lesson ${itemIndex + 1}`)}
                                              </p>
                                              {item.description && (
                                                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{item.description}</p>
                                              )}
                                              {!!contentsWritingBlocks.length && (
                                                <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
                                                  {contentsWritingBlocks.map((blockEntry) => (
                                                    <div key={blockEntry.blockKey} className="rounded-lg bg-[#fcfbf7] px-2.5 py-2">
                                                      <div className="flex flex-wrap items-center gap-2">
                                                        {blockEntry.lessonLabel && (
                                                          <span className="rounded-full border border-[#eadfbd] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a7a00]">
                                                            {blockEntry.lessonLabel}
                                                          </span>
                                                        )}
                                                        <p className="text-[11px] font-bold text-gray-700">
                                                          {blockEntry.titleLines[0]}
                                                        </p>
                                                      </div>
                                                      {blockEntry.titleLines.length > 1 && (
                                                        <p className="mt-1 text-[10px] leading-relaxed text-gray-500">
                                                          {blockEntry.titleLines.slice(1).join(' • ')}
                                                        </p>
                                                      )}
                                                      {blockEntry.subtitle && (
                                                        <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-gray-500">
                                                          {blockEntry.subtitle}
                                                        </p>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-[#fcfbf7] px-4 py-4 text-xs text-gray-500">
                              Add modules and lesson items to generate the clickable contents page automatically.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <ImageUploader
                    images={form.images || []}
                    onChange={urls => sf('images', urls)}
                    uploadEndpoint="/api/products/upload"
                    token={token}
                    maxImages={3}
                  />
                </div>

                <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-xl">
                  {[['available','Available'],['featured','Featured'],['fastSelling','Fast Selling'],['hasDiscount','Discount']].map(([k,l]) => (
                    <label key={k} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input type="checkbox" checked={!!form[k]} onChange={e => sf(k,e.target.checked)} disabled={k === 'hasDiscount' && form.digitalAccessKind === 'free'} className="w-4 h-4 accent-black" /> {l}
                    </label>
                  ))}
                </div>

                {form.digitalAccessKind === 'trial' && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                    The customer starts with free access for the selected number of trial days. We then attempt the saved card charge automatically using the billing price above.
                  </div>
                )}

                {form.digitalAccessKind === 'free' && (
                  <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-800">
                    This digital product is free. Customers can claim access without paying, and discounts will be ignored.
                  </div>
                )}

                {form.isSeries && (
                  <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-800">
                    Each module can hold multiple ordered lesson items. Use module titles plus the item order inside each module to control exactly how learners move from text to audio, video, or downloadable resources.
                  </div>
                )}

                {form.hasDiscount && form.digitalAccessKind !== 'free' && (
                  <div className="grid sm:grid-cols-2 gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <p className="sm:col-span-2 text-xs font-bold text-green-800">Discount Settings</p>
                    <select value={form.discount?.type||'percent'} onChange={e => sfd('type',e.target.value)} className={inp}>
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed amount (GHS)</option>
                    </select>
                    <input value={form.discount?.value||''} onChange={e => sfd('value',e.target.value)} placeholder={form.discount?.type==='percent'?'e.g. 20':'e.g. 50'} type="number" className={inp} />
                    <input value={form.discount?.label||''} onChange={e => sfd('label',e.target.value)} placeholder='Label e.g. "Launch Offer"' className={inp} />
                    <input value={form.discount?.limitCustomers||''} onChange={e => sfd('limitCustomers',e.target.value)} placeholder="First N customers only (optional)" type="number" className={inp} />
                    <input value={form.discount?.startDate||''} onChange={e => sfd('startDate',e.target.value)} type="date" className={inp} />
                    <input value={form.discount?.endDate||''} onChange={e => sfd('endDate',e.target.value)} type="date" className={inp} />
                    <div className="sm:col-span-2 rounded-2xl border border-green-200 bg-white/90 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-700">Discount Preview</p>
                      {Number(form.retailPrice) > 0 && digitalDiscountPreview.isConfigured ? (
                        <>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {!!digitalDiscountPreview.label && (
                              <span className="rounded-full bg-[#fcfbf7] px-2.5 py-1 text-[11px] font-extrabold text-[#9a7a00] border border-[#FDC700]/25">
                                {digitalDiscountPreview.label}
                              </span>
                            )}
                            {!!digitalDiscountPreview.limitText && (
                              <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                                {digitalDiscountPreview.limitText}
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-end gap-5">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Was</p>
                              <p className="text-sm font-bold text-gray-400 line-through">{formatMoney(digitalDiscountPreview.basePrice)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Now</p>
                              <p className="text-2xl font-extrabold text-black">{formatMoney(digitalDiscountPreview.finalPrice)}</p>
                            </div>
                          </div>
                          <p className="mt-2 text-sm font-extrabold text-green-700">
                            {digitalDiscountPreview.offerText}{digitalDiscountPreview.limitText ? ` ${digitalDiscountPreview.limitText}` : ''}
                          </p>
                          <p className="mt-1 text-xs text-green-700">
                            This uses the set retail price of {formatMoney(form.retailPrice)} and saves {formatMoney(digitalDiscountPreview.savedAmount)}.
                          </p>
                          {(form.discount?.startDate || form.discount?.endDate) && (
                            <p className="mt-1 text-[11px] text-gray-500">
                              Runs {form.discount?.startDate ? formatAdminDate(form.discount.startDate) : 'now'}
                              {form.discount?.endDate ? ` to ${formatAdminDate(form.discount.endDate)}` : ' until you stop it'}.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">
                          Set the retail price and discount value to preview the real storefront offer from the actual product price.
                        </p>
                      )}
                    </div>
                    <p className="sm:col-span-2 text-xs text-green-700">Secure files stay protected after purchase while storefront discounts still work normally.</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'Certificates' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 mb-1">Certificate Generator</p>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Pending digital certificate requests appear here automatically. Learners now submit their exact certificate name, email and phone before the request lands here. You can also create manual certificates for learners, trainees, sponsors, or partner programmes. Certificate previews now open in true A4 landscape layout for cleaner printing.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-600">Quick guide</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Most text fields below appear on the final certificate exactly as typed, so you can use the examples under each field to guide a non-technical admin.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 space-y-3">
                    <select
                      value={form.type||'manual'}
                      onChange={e => {
                        const nextType = e.target.value;
                        setForm(current => ({
                          ...current,
                          type: nextType,
                          generationChoiceMade: nextType === 'manual'
                            ? true
                            : current.type === 'manual'
                              ? false
                              : current.generationChoiceMade,
                        }));
                      }}
                      className={inp}
                    >
                      <option value="manual">Manual certificate</option>
                      <option value="digital_request">Digital product request</option>
                    </select>
                    <p className={certHelp}>Choose `manual` when creating a fresh certificate yourself, or `digital product request` when it came from a learner.</p>
                  </div>
                  <div>
                    <select value={form.status||'generated'} onChange={e => sf('status',e.target.value)} className={inp}>
                      <option value="pending">Pending review</option>
                      <option value="generated">Generated</option>
                      <option value="declined">Declined</option>
                    </select>
                    <p className={certHelp}>Use `pending` while reviewing, `generated` when the certificate is ready, and `declined` if it should not be issued.</p>
                  </div>

                  {form.type === 'manual' && (
                    <>
                  <div>
                    <select
                      value={form.generationMode || 'manual'}
                      onChange={e => {
                        const nextMode = e.target.value === 'template' ? 'template' : 'manual';
                        setForm(current => nextMode === 'manual'
                          ? { ...current, generationMode: 'manual', templateId: '', templateName: '', templateCandidateId: '', templatePickerOpen: false }
                          : { ...current, generationMode: 'template', templateCandidateId: current.templateId || current.templateCandidateId || getCertificateTemplateKey(visibleCertificateTemplates[0]) || '', templatePickerOpen: true });
                      }}
                      className={inp}
                    >
                      <option value="manual">Manual generator</option>
                      <option value="template">Use saved template</option>
                    </select>
                    <p className={certHelp}>Choose `manual generator` to design this certificate directly here, or `use saved template` to prefill it from a reusable certificate layout.</p>
                  </div>
                  <div className="sm:col-span-2 space-y-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-600">Template library</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {(form.generationMode || 'manual') === 'template'
                              ? 'Choose a visual template below, preview it if needed, then apply it. Every field still stays editable afterwards.'
                              : 'Open the template library to start from a preset or previously saved certificate design.'}
                          </p>
                          <p className="text-[11px] font-bold text-gray-400 mt-2">
                            {visibleCertificateTemplates.length} template{visibleCertificateTemplates.length === 1 ? '' : 's'} available
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={openManualCertificateTemplateLibrary}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-black hover:text-black"
                        >
                          Browse Templates
                        </button>
                      </div>
                      {!hasPresetCertificateTemplates && (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                          Preset templates are still syncing. If you only see your old saved templates here, refresh the Certificates tab after the backend restart so the 7 new presets can appear.
                        </p>
                      )}
                    </div>

                    {((form.generationMode || 'manual') === 'template' || form.templatePickerOpen) && (
                      <div className="space-y-3">
                        <CertificateTemplateDropdown
                          templates={visibleCertificateTemplates}
                          selectedId={activeCertificateTemplateId}
                          appliedId={form.templateId || ''}
                          onSelectId={(templateId) => setForm((current) => ({
                            ...current,
                            templateCandidateId: templateId,
                            templatePickerOpen: true,
                          }))}
                          onPreview={previewCertificateTemplateRecord}
                          onApply={async (template) => {
                            setForm((current) => ({ ...current, templateCandidateId: getCertificateTemplateKey(template), templatePickerOpen: true }));
                            await applyCertificateTemplateFromPicker(template, { markChosen: true, keepPickerOpen: false });
                          }}
                          applyLabel={form.templateId ? 'Apply Again' : 'Use This Template'}
                          emptyMessage="No saved templates yet. Use the manual generator once, then save that design as a reusable template."
                          selectLabel="Choose saved template"
                        />
                        <p className={certHelp}>
                          {activeCertificateTemplate
                            ? `Selected layout: ${activeCertificateTemplate.name}. Preview it or apply it below.`
                            : 'Choose a saved template from the dropdown to preview or apply it.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {form.showSelectedTemplateCallout && form.templateId && (form.generationMode || 'manual') === 'template' && (() => {
                    const selectedTemplate = findCertificateTemplate(visibleCertificateTemplates, form.templateId);
                    if (!selectedTemplate) return null;
                    return (
                      <div className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Saved Template Selected</p>
                            <p className="text-sm font-extrabold text-blue-950 mt-1">{selectedTemplate.name}</p>
                            <p className="text-xs text-blue-900/80 mt-1">
                              {selectedTemplate.certificateTitle || selectedTemplate.productName || 'Certificate'}
                              {selectedTemplate.organizerName ? ` • ${selectedTemplate.organizerName}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => applySelectedCertificateTemplate(form.templateId)}
                            className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 hover:border-blue-400"
                          >
                            Re-apply Template
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                    </>
                  )}

                  <div>
                    <input value={form.learnerName||''} onChange={e => sf('learnerName',e.target.value)} placeholder="Learner full name *" className={inp} />
                    <p className={certHelp}>This is the exact name printed on the certificate. Example: `Davida Amponsah Prempeh`.</p>
                  </div>
                  <div>
                    <input value={form.productName||''} onChange={e => sf('productName',e.target.value)} placeholder="Course / product / programme" className={inp} />
                    <p className={certHelp}>This is the course or programme name shown in the certificate body. Example: `Beginner Footwear Crash Course`.</p>
                  </div>

                  <div>
                    <input value={form.learnerEmail||''} onChange={e => sf('learnerEmail',e.target.value)} placeholder="Email to" className={inp} />
                    <p className={certHelp}>The final certificate PDF will be sent here. Example: `learner@example.com`.</p>
                  </div>
                  <div>
                    <input value={form.learnerPhone||''} onChange={e => sf('learnerPhone',e.target.value)} placeholder="Learner phone" className={inp} />
                    <p className={certHelp}>For follow-up or WhatsApp confirmation only. Example: `0594038888` or `+233594038888`.</p>
                  </div>

                  <div>
                    <input value={form.requestedAt||''} onChange={e => sf('requestedAt',e.target.value)} type="date" className={inp} />
                    <p className={certHelp}>When the learner asked for the certificate or when you recorded the request.</p>
                  </div>
                  <div>
                    <input value={form.issueDate||''} onChange={e => sf('issueDate',e.target.value)} type="date" className={inp} />
                    <p className={certHelp}>The date printed as the official issue date on the certificate.</p>
                  </div>

                  {form.type === 'digital_request' && (
                    <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Certificate Design Path</p>
                          <p className="text-sm font-extrabold text-black mt-1">
                            {certificateChoicePending
                              ? 'Choose how this learner request should be generated'
                              : form.generationMode === 'template'
                                ? 'Saved template path selected'
                                : 'Manual generator path selected'}
                          </p>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-2xl">
                          {certificateChoicePending
                            ? 'This learner request will stay waiting until you choose whether to use the manual generator or a saved template first.'
                            : form.generationMode === 'template'
                              ? 'You can preview the chosen template, apply it to this request, and still edit every certificate field normally afterwards.'
                              : 'You are using the manual generator for this learner request, and you can still save the finished result as a reusable template later.'}
                        </p>
                        {!!form.requestNotes && (
                          <p className="mt-3 rounded-xl border border-gray-200 bg-[#fcfbf7] px-3 py-2 text-xs text-gray-600 leading-relaxed">
                            Learner note: {form.requestNotes}
                          </p>
                        )}
                      </div>
                        {form.generationChoiceMade && (
                          <button
                            type="button"
                            onClick={resetCertificateGenerationChoice}
                            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-black hover:text-black"
                          >
                            Change Selection
                          </button>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                        <button
                          type="button"
                          onClick={chooseManualCertificateGenerator}
                          className={`rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                            form.generationChoiceMade && form.generationMode === 'manual'
                              ? 'border-black bg-black text-white'
                              : 'border-gray-200 bg-[#fcfbf7] text-gray-800 hover:border-black'
                          }`}
                        >
                          <p className="text-sm font-extrabold">Use Manual Generator</p>
                          <p className={`mt-2 text-xs leading-relaxed ${
                            form.generationChoiceMade && form.generationMode === 'manual' ? 'text-gray-200' : 'text-gray-500'
                          }`}>
                            Open the full editor, make all the design changes yourself, and save the finished layout later as a template if you want.
                          </p>
                        </button>

                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-extrabold text-blue-950">Use Saved Template</p>
                              <p className="mt-2 text-xs text-blue-900/80 leading-relaxed">
                                Select one of your saved certificate templates, preview it if needed, then apply it to this learner request before editing the details normally.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={openCertificateTemplateChooser}
                              className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 hover:border-blue-400"
                            >
                              Select Template
                            </button>
                          </div>

                          {form.templatePickerOpen && (
                            <div className="mt-4 space-y-3">
                              {visibleCertificateTemplates.length > 0 ? (
                                <>
                                  <CertificateTemplateDropdown
                                    templates={visibleCertificateTemplates}
                                    selectedId={activeCertificateTemplateId}
                                    appliedId={form.templateId || ''}
                                    onSelectId={(templateId) => setForm(current => ({
                                      ...current,
                                      templateCandidateId: templateId,
                                      templatePickerOpen: true,
                                    }))}
                                    onPreview={previewCertificateTemplateRecord}
                                    onApply={async (template) => {
                                      setForm(current => ({
                                        ...current,
                                        templateCandidateId: getCertificateTemplateKey(template),
                                        templatePickerOpen: true,
                                      }));
                                      await applyCertificateTemplateFromPicker(template, { markChosen: true, keepPickerOpen: false });
                                    }}
                                    applyLabel={form.generationChoiceMade && form.generationMode === 'template' ? 'Re-apply Template' : 'Use This Template'}
                                    selectLabel="Choose learner template"
                                  />
                                  <p className={certHelp}>
                                    {activeCertificateTemplate
                                      ? `Active selection: ${activeCertificateTemplate.name}. Preview it or apply it below.`
                                      : 'Pick a saved template from the dropdown to preview or apply it to this learner request.'}
                                  </p>
                                </>
                              ) : (
                                <div className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs text-blue-900/80">
                                  No saved templates yet. Use the manual generator once, then save that finished design as a template for later learner requests.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!certificateChoicePending && (
                    <>
                  <div>
                    <input value={form.certificateTitle||''} onChange={e => sf('certificateTitle',e.target.value)} placeholder="Certificate title" className={inp} />
                    <p className={certHelp}>Main heading at the top. Example: `Certificate of Completion` or `Certification of Recognition`.</p>
                  </div>
                  <div>
                    <input value={form.certificateSubtitle||''} onChange={e => sf('certificateSubtitle',e.target.value)} placeholder="Certificate subtitle (optional)" className={inp} />
                    <p className={certHelp}>Smaller line under the title. Example: `Professional Training Award` or the cohort name.</p>
                  </div>

                  <div>
                    <input value={form.organizerName||''} onChange={e => sf('organizerName',e.target.value)} placeholder="Organizer / issuing body" className={inp} />
                    <p className={certHelp}>Who is issuing the certificate. Example: `Belle Kreyashon Academy` or a partner institution.</p>
                  </div>
                  <div>
                    <input value={form.sponsors||''} onChange={e => sf('sponsors',e.target.value)} placeholder="Sponsors (comma separated)" className={inp} />
                    <p className={certHelp}>Shown at the bottom when present. Example: `The BrandHelper, XYZ Foundation`.</p>
                  </div>

                  <div>
                    <label className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 flex items-center justify-between gap-3">
                      <span className="font-bold">Primary color</span>
                      <input value={form.primaryColor||'#111827'} onChange={e => sf('primaryColor',e.target.value)} type="color" className="w-10 h-10 rounded-lg border-0 bg-transparent p-0 cursor-pointer" />
                    </label>
                    <p className={certHelp}>Used for the border, title, and strong headings on the certificate.</p>
                  </div>
                  <div>
                    <label className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 flex items-center justify-between gap-3">
                      <span className="font-bold">Accent color</span>
                      <input value={form.accentColor||'#FDC700'} onChange={e => sf('accentColor',e.target.value)} type="color" className="w-10 h-10 rounded-lg border-0 bg-transparent p-0 cursor-pointer" />
                    </label>
                    <p className={certHelp}>Used for the subtitle, highlight text, seal, and supporting emphasis.</p>
                  </div>

                  <div>
                    <label className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 flex items-center justify-between gap-3">
                      <span className="font-bold">Background color</span>
                      <input value={form.backgroundColor||'#FFFDF7'} onChange={e => sf('backgroundColor',e.target.value)} type="color" className="w-10 h-10 rounded-lg border-0 bg-transparent p-0 cursor-pointer" />
                    </label>
                    <p className={certHelp}>This fills the main certificate sheet itself. Choose a soft cream, white, or brand-friendly background.</p>
                  </div>
                  <div>
                    <label className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 flex items-center justify-between gap-3">
                      <span className="font-bold">Font color</span>
                      <input value={form.fontColor||'#374151'} onChange={e => sf('fontColor',e.target.value)} type="color" className="w-10 h-10 rounded-lg border-0 bg-transparent p-0 cursor-pointer" />
                    </label>
                    <p className={certHelp}>Used mainly for body text and supporting details. Dark grey usually reads best.</p>
                  </div>

                  <div>
                    <select value={form.fontFamily||'classic_serif'} onChange={e => sf('fontFamily',e.target.value)} className={inp}>
                      {CERTIFICATE_FONTS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <p className={certHelp}>Changes the overall personality of the certificate text. Serif feels classic, sans-serif feels modern.</p>
                  </div>
                  <div>
                    <select value={form.frameStyle||'classic'} onChange={e => sf('frameStyle',e.target.value)} className={inp}>
                      {CERTIFICATE_LAYOUT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <p className={certHelp}>Changes the full certificate layout, including border treatment, decorative shapes, corner styling, and overall art direction.</p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-[#fcfbf7] px-4 py-3 flex items-center gap-3 sm:col-span-2">
                    <div className="flex gap-2">
                      <span className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: form.primaryColor || '#111827' }} />
                      <span className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: form.accentColor || '#FDC700' }} />
                      <span className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: form.backgroundColor || '#FFFDF7' }} />
                      <span className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: form.fontColor || '#374151' }} />
                    </div>
                    <p className="text-xs text-gray-500">
                      Layout: <span className="font-bold text-gray-700">{getCertificateLayoutLabel(form.frameStyle || 'classic')}</span>
                      {' • '}
                      Font: <span className="font-bold text-gray-700">{CERTIFICATE_FONTS.find(option => option.value === (form.fontFamily || 'classic_serif'))?.label || 'Classic Serif'}</span>
                      {' • '}
                      Background: <span className="font-bold text-gray-700">{form.backgroundColor || '#FFFDF7'}</span>
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <textarea value={form.certificateBody||''} onChange={e => sf('certificateBody',e.target.value)} placeholder="Certificate body or achievement statement. Keep it short and avoid repeating the learner name or programme title." rows={4} className={inp + ' resize-none'} />
                    <p className={certHelp}>This is the main statement in the middle. Example: `For successfully completing the Beginner Footwear Crash Course and demonstrating practical skills in design and finishing.`</p>
                  </div>

                  <div className="sm:col-span-2">
                    <textarea value={form.requestNotes||''} onChange={e => sf('requestNotes',e.target.value)} placeholder="Learner request notes (optional)" rows={2} className={inp + ' resize-none'} />
                    <p className={certHelp}>Admin-only note from the learner or organiser. Example: `Please use full middle name on the certificate`.</p>
                  </div>
                    </>
                  )}
                </div>

                <div className={`grid gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 ${certificateChoicePending ? 'sm:grid-cols-1' : 'sm:grid-cols-3'}`}>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2">Completion snapshot</p>
                    <div className="space-y-2">
                      <input value={form.completionSnapshot?.totalModules ?? 0} onChange={e => setForm(f => ({ ...f, completionSnapshot: { ...f.completionSnapshot, totalModules: e.target.value } }))} placeholder="Total modules" type="number" className={inp} />
                      <input value={form.completionSnapshot?.completedModules ?? 0} onChange={e => setForm(f => ({ ...f, completionSnapshot: { ...f.completionSnapshot, completedModules: e.target.value } }))} placeholder="Completed modules" type="number" className={inp} />
                      <input value={form.completionSnapshot?.percent ?? 0} onChange={e => setForm(f => ({ ...f, completionSnapshot: { ...f.completionSnapshot, percent: e.target.value } }))} placeholder="Completion %" type="number" className={inp} />
                    </div>
                    <p className={certHelp}>Admin tracking only. Example: `10 total`, `10 completed`, `100%` when a learner finished every module.</p>
                  </div>
                  {!certificateChoicePending && (
                    <>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2">Signatory 1</p>
                    <div className="space-y-2">
                      <input value={form.signatoryOneName||''} onChange={e => sf('signatoryOneName',e.target.value)} placeholder="Name" className={inp} />
                      <input value={form.signatoryOneRole||''} onChange={e => sf('signatoryOneRole',e.target.value)} placeholder="Role / title" className={inp} />
                    </div>
                    <p className={certHelp}>Example: `Black Bird` and `Lead Facilitator` or `Programme Director`.</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2">Signatory 2</p>
                    <div className="space-y-2">
                      <input value={form.signatoryTwoName||''} onChange={e => sf('signatoryTwoName',e.target.value)} placeholder="Name" className={inp} />
                      <input value={form.signatoryTwoRole||''} onChange={e => sf('signatoryTwoRole',e.target.value)} placeholder="Role / title" className={inp} />
                    </div>
                    <p className={certHelp}>Use this for a co-signer, sponsor rep, partner lead, or leave it blank if not needed.</p>
                  </div>
                    </>
                  )}
                </div>

                {!certificateChoicePending && (
                <div>
                  <textarea value={form.notes||''} onChange={e => sf('notes',e.target.value)} placeholder="Admin notes (optional)" rows={2} className={inp + ' resize-none'} />
                  <p className={certHelp}>Internal only. Example: `Used for May 2026 graduation batch` or `Waiting for sponsor confirmation`.</p>
                </div>
                )}

                {!certificateChoicePending ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => generateCertificate(buildCertificateBody(form), { autoPrint: false })}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black"
                  >
                    <Award size={15} />
                    Preview Certificate
                  </button>
                  <button
                    type="button"
                    onClick={saveCertificateTemplate}
                    disabled={certificateBusy === 'save-template'}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-60"
                  >
                    {certificateBusy === 'save-template' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                    Save As Template
                  </button>
                  {form.status === 'generated' && (
                    <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold ${
                      isCertificateIssued(form)
                        ? 'border-green-200 bg-green-50 text-green-700'
                        : form.emailStatus === 'failed'
                          ? 'border-red-200 bg-red-50 text-red-600'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}>
                      {isCertificateIssued(form)
                        ? <CheckCircle size={15} />
                        : form.emailStatus === 'failed'
                          ? <AlertCircle size={15} />
                          : <Circle size={15} />}
                      {formatCertificateEmailStatus(form)}
                    </div>
                  )}
                  {editId && form.status === 'generated' && (
                    <button
                      type="button"
                      onClick={() => sendCertificateEmail({ _id: editId, learnerEmail: form.learnerEmail })}
                      disabled={certificateBusy === `email-${editId}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-60"
                    >
                      {certificateBusy === `email-${editId}` ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                      Send Certificate Email
                    </button>
                  )}
                  {editId && form.status === 'generated' && (
                    <button
                      type="button"
                      onClick={() => shareCertificateWhatsApp({ _id: editId, learnerPhone: form.learnerPhone })}
                      disabled={certificateBusy === `whatsapp-${editId}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-60"
                    >
                      {certificateBusy === `whatsapp-${editId}` ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                      Share On WhatsApp
                    </button>
                  )}
                  {editId && form.status === 'generated' && (
                    <button
                      type="button"
                      onClick={() => downloadCertificatePdf({ _id: editId, certificateNumber: form.certificateNumber, certificateTitle: form.certificateTitle })}
                      disabled={certificateBusy === `download-${editId}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:border-black hover:text-black disabled:opacity-60"
                    >
                      {certificateBusy === `download-${editId}` ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                      Download PDF
                    </button>
                  )}
                  {form.type === 'digital_request' && form.digitalAccess && (
                    <p className="text-xs text-gray-500 self-center">
                      This request is linked to a learner purchase and will update their library status after you save it.
                    </p>
                  )}
                  {form.generationMode === 'manual' && (
                    <p className="text-xs text-gray-500 self-center">
                      Manual generator mode is active. If you like this finished design, save it as a reusable template for later learner requests and bulk generation.
                    </p>
                  )}
                </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                    Choose the manual generator or apply a saved template above before previewing, generating, or sending this learner certificate.
                  </div>
                )}
              </div>
            )}

            {tab === 'Training' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.title||''}    onChange={e => sf('title',e.target.value)}    placeholder="Title *"                       className={inp} />
                <input value={form.date||''}     onChange={e => sf('date',e.target.value)}     placeholder="Date (e.g. 15 April 2026)"     className={inp} />
                <input value={form.venue||''}    onChange={e => sf('venue',e.target.value)}    placeholder="Venue / Location"              className={inp} />
                <input value={form.price||''}    onChange={e => sf('price',e.target.value)}    placeholder="Price (GHS)"    type="number"   className={inp} />
                <input value={form.capacity||''} onChange={e => sf('capacity',e.target.value)} placeholder="Capacity (optional)" type="number" className={inp} />
                <input value={form.image||''}    onChange={e => sf('image',e.target.value)}    placeholder="Image URL (optional)"          className={inp} />
                <input value={form.partners||''} onChange={e => sf('partners',e.target.value)} placeholder="Partners (comma separated)"     className={inp} />
                <input value={form.sponsors||''} onChange={e => sf('sponsors',e.target.value)} placeholder="Sponsors (comma separated)"     className={inp} />
                <TrainingImageUploader
                  image={form.image || ''}
                  onChange={url => sf('image', url)}
                  uploadEndpoint="/api/training/upload"
                  token={token}
                />
                <label className="sm:col-span-2 flex items-start gap-2 text-sm font-bold cursor-pointer p-3 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    checked={form.active !== false}
                    onChange={e => sf('active', e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-black"
                  />
                  <span>
                    Show this training to the public website
                    <span className="block text-xs font-normal text-gray-400 mt-0.5">
                      Turn this off to hide the training from customers without deleting it.
                    </span>
                  </span>
                </label>
                <textarea value={form.desc||''} onChange={e => sf('desc',e.target.value)} placeholder="Description" rows={2} className={inp+' resize-none sm:col-span-2'} />
              </div>
            )}

            {/* ── DELIVERY form ── */}
            {tab === 'Delivery' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.name||''} onChange={e => sf('name',e.target.value)} placeholder="Zone name (e.g. Osu / Airport Area) *" className={inp} />
                <input value={form.fee||''}  onChange={e => sf('fee',e.target.value)}  placeholder="Delivery fee (GHS) *" type="number"      className={inp} />
              </div>
            )}

            {/* ── CONSULTATIONS form ── */}
            {tab === 'Consultations' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.title||''}    onChange={e => sf('title',e.target.value)}    placeholder="Title *"                                 className={inp} />
                <input value={form.price||''}    onChange={e => sf('price',e.target.value)}    placeholder="Price (GHS, 0 for free)" type="number"   className={inp} />
                <input value={form.duration||''} onChange={e => sf('duration',e.target.value)} placeholder="Duration (e.g. 1 hour)"                  className={inp} />
                <input value={form.validity||''} onChange={e => sf('validity',e.target.value)} placeholder="Validity (e.g. Valid for 7 days)"        className={inp} />
                <textarea value={form.desc||''} onChange={e => sf('desc',e.target.value)} placeholder="Description" rows={3} className={inp+' resize-none sm:col-span-2'} />
                <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
                  <input type="checkbox" checked={!!form.isFree} onChange={e => sf('isFree',e.target.checked)} className="w-4 h-4 accent-black" /> Mark as Free
                </label>
              </div>
            )}

            {/* ── BLOG form ── */}
            {tab === 'Blog' && (
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.title||''} onChange={e => sf('title',e.target.value)} placeholder="Post title *" className={inp+' sm:col-span-2'} />
                <div className="flex bg-gray-100 rounded-xl p-1 sm:col-span-2">
                  {['image','video','both'].map(m => (
                    <button key={m} onClick={() => sf('mediaType',m)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${form.mediaType===m?'bg-black text-white':'text-gray-500'}`}>{m}</button>
                  ))}
                </div>
                {(form.mediaType === 'image' || form.mediaType === 'both') && (
                  <input value={form.coverImage||''} onChange={e => sf('coverImage',e.target.value)} placeholder="Cover image URL or Drive link" className={inp} />
                )}
                {(form.mediaType === 'video' || form.mediaType === 'both') && (
                  <input value={form.videoUrl||''} onChange={e => sf('videoUrl',e.target.value)} placeholder="Video URL (YouTube, TikTok, direct link)" className={inp} />
                )}
                <input value={form.tags||''} onChange={e => sf('tags',e.target.value)} placeholder="Tags (comma separated: hair, tips, wigs)" className={inp} />
                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input type="checkbox" checked={!!form.published} onChange={e => sf('published',e.target.checked)} className="w-4 h-4 accent-black" /> Publish now
                </label>
                <textarea value={form.excerpt||''} onChange={e => sf('excerpt',e.target.value)} placeholder="Short excerpt (shown on blog listing)" rows={2}  className={inp+' resize-none sm:col-span-2'} />
                <textarea value={form.content||''} onChange={e => sf('content',e.target.value)} placeholder="Full post content..."                   rows={8}  className={inp+' resize-none sm:col-span-2'} />
              </div>
            )}

            {/* ── FEATURED form ── */}
            {tab === 'Featured' && (
              <div className="space-y-3">
                {/* Partner info — optional */}
                <div className="grid sm:grid-cols-2 gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="sm:col-span-2 text-xs font-bold text-blue-800">Partner Info <span className="font-normal text-blue-500">(optional — not shown to customers)</span></p>
                  <input value={form.brandName||''}   onChange={e => sf('brandName',e.target.value)}   placeholder="Brand / business name (optional)"           className={inp} />
                  <input value={form.contactInfo||''} onChange={e => sf('contactInfo',e.target.value)} placeholder="Brand contact / WhatsApp (optional)"        className={inp} />
                </div>

                {/* Product details */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.productName||''} onChange={e => sf('productName',e.target.value)} placeholder="Product name (shown to customers) *" className={inp} />
                  <select value={form.category||''} onChange={e => sf('category',e.target.value)} className={inp}>
                    <option value="">Category</option>
                    {physicalCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="sm:col-span-2 flex gap-2">
                    <input value={customCat} onChange={e => setCustomCat(e.target.value)} placeholder="Or type a new category..." className={inp+' flex-1'} />
                    {customCat && <button type="button" onClick={applyCustomCategory} className="px-3 py-2 bg-[#FDC700] text-black text-xs font-bold rounded-xl whitespace-nowrap">Use</button>}
                  </div>
                  <input value={form.price||''}  onChange={e => sf('price',e.target.value)}  placeholder="Price (GHS)"                      type="number" className={inp} />
                  <input value={form.stock||''}  onChange={e => sf('stock',e.target.value)}  placeholder="Stock quantity (update daily)"    type="number" className={inp} />
                  <textarea value={form.desc||''} onChange={e => sf('desc',e.target.value)} placeholder="Product description" rows={2} className={inp+' resize-none sm:col-span-2'} />

                  {/* Image uploader — max 3 */}
                  <ImageUploader
                    images={form.images || []}
                    onChange={urls => sf('images', urls)}
                    uploadEndpoint="/api/featured/upload"
                    token={token}
                    maxImages={3}
                  />
                </div>

                {/* Flags */}
                <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-xl">
                  {[['available','Available'],['featured','Featured'],['fastSelling','Fast Selling'],['isPreOrder','Pre-Order'],['hasDiscount','Discount']].map(([k,l]) => (
                    <label key={k} className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input type="checkbox" checked={!!form[k]} onChange={e => sf(k,e.target.checked)} className="w-4 h-4 accent-black" /> {l}
                    </label>
                  ))}
                </div>

                {form.isPreOrder && (
                  <div className="grid sm:grid-cols-2 gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                    <p className="sm:col-span-2 text-xs font-bold text-yellow-800">Pre-Order</p>
                    <select value={form.preOrderType||''} onChange={e => sf('preOrderType',e.target.value)} className={inp}>
                      <option value="">Payment type *</option>
                      <option value="deposit">Deposit only</option>
                      <option value="full">Full payment</option>
                    </select>
                    {form.preOrderType === 'deposit' && <input value={form.depositPercent||''} onChange={e => sf('depositPercent',e.target.value)} placeholder="Deposit %" type="number" className={inp} />}
                  </div>
                )}

                {form.hasDiscount && (
                  <div className="grid sm:grid-cols-2 gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <p className="sm:col-span-2 text-xs font-bold text-green-800">Discount</p>
                    <select value={form.discount?.type||'percent'} onChange={e => sfd('type',e.target.value)} className={inp}>
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed amount (GHS)</option>
                    </select>
                    <input value={form.discount?.value||''}   onChange={e => sfd('value',e.target.value)}   placeholder="Value"               type="number" className={inp} />
                    <input value={form.discount?.label||''}   onChange={e => sfd('label',e.target.value)}   placeholder='Label e.g. "Flash Sale!"'          className={inp} />
                    <input value={form.discount?.endDate||''} onChange={e => sfd('endDate',e.target.value)} type="date"                                       className={inp} />
                  </div>
                )}

                {/* Subscription plan */}
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold mb-1">Subscription Plan</p>
                  <p className="text-xs text-gray-400 mb-2">Auto-expires after this duration.</p>
                  <div className="flex flex-wrap gap-2">
                    {PLANS.map(p => (
                      <button key={p} onClick={() => sf('plan',p)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${Number(form.plan)===p?'bg-black text-white border-black':'border-gray-200 hover:border-black'}`}>
                        {p} month{p>1?'s':''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={save}      className="px-5 py-2.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900">Save</button>
              <button onClick={closeForm} className="px-5 py-2.5 bg-gray-100 font-bold text-sm rounded-xl hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        )}

        {tab === 'Certificates' && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 mb-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div>
                <h3 className="font-extrabold">Bulk Certificate Generator</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Save a finished certificate design as a template, then paste one learner per line using `Full Name, email, phone` or `Full Name | email | phone`.
                </p>
              </div>
              <p className="text-xs text-gray-400">A4 output • reusable templates • email-ready</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3">
                <div className="rounded-2xl border border-gray-100 bg-[#fcfbf7] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-600">Choose template</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pick a preset or saved certificate design first. The selected card below becomes the layout used for everyone in this bulk batch.
                  </p>
                  {!hasPresetCertificateTemplates && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                      Preset templates are still syncing. Refresh this tab after the backend restart if the 7 new preset designs do not show yet.
                    </p>
                  )}
                </div>
                <CertificateTemplateDropdown
                  templates={visibleCertificateTemplates}
                  selectedId={bulkTemplateId}
                  appliedId={bulkTemplateId}
                  onSelectId={(templateId) => setBulkTemplateId(templateId)}
                  onPreview={previewCertificateTemplateRecord}
                  emptyMessage="No saved templates yet. Save a certificate design as a template first, then it will appear here for bulk generation."
                  selectLabel="Choose bulk template"
                />
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-600">Learner list</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Add one learner per line using `Full Name, email, phone` or `Full Name | email | phone`.
                  </p>
                </div>
                <textarea
                  value={bulkLearners}
                  onChange={e => setBulkLearners(e.target.value)}
                  placeholder={`Ama Mensah, ama@example.com, 0240000000\nKwame Asare | kwame@example.com | 0550000000\nJoan Doe`}
                  rows={7}
                  className={inp + ' resize-none'}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={bulkGenerateFromTemplate}
                    disabled={certificateBusy === 'bulk-generate'}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 disabled:opacity-60"
                  >
                    {certificateBusy === 'bulk-generate' ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />}
                    Generate Bulk Certificates
                  </button>
                  <p className="text-xs text-gray-500 self-center">
                    Each line generates one ready certificate and keeps its email field available for sending.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders filters */}
        {tab === 'Orders' && !loading && (
          <div className="mb-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {['all','new','processing','delivery-ongoing','delivered','cancelled'].map(s => (
                <button key={s} onClick={() => {
                  setOrderFilter(s);
                  const ep = s === 'all' ? '/api/orders' : `/api/orders?status=${s}`;
                  api.get(ep, auth).then(r => setData(r.data)).catch(() => {});
                }} className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 capitalize transition-all ${orderFilter===s?'bg-black text-white border-black':'border-gray-200 hover:border-black'}`}>
                  {s === 'all' ? 'All' : s.replace('-',' ')}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Filter by customer name or phone..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-black" />
              </div>
              {customerSearch && <button onClick={() => setCustomerSearch('')} className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-bold shrink-0"><X size={13}/></button>}
              <button onClick={() => downloadCSV(data, 'belle-kreyashon-orders.csv')}
                className="px-3 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-900 whitespace-nowrap">↓ Export CSV</button>
            </div>
          </div>
        )}

        {tab === 'Analytics' && !loading && salesAnalytics && (
          <div className="space-y-5 mb-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total Revenue', value: formatMoney(analyticsSummary.totalRevenue), hint: `${formatMoney(analyticsSummary.last30DaysRevenue)} in the last 30 days` },
                { label: 'Shop Orders', value: formatMoney(analyticsSummary.orderRevenue), hint: `${analyticsSummary.orderCount || 0} paid order${analyticsSummary.orderCount === 1 ? '' : 's'}` },
                { label: 'Bookings', value: formatMoney(analyticsSummary.bookingRevenue), hint: `${analyticsSummary.bookingCount || 0} paid booking${analyticsSummary.bookingCount === 1 ? '' : 's'}` },
                { label: 'Digital Claims', value: `${analyticsSummary.freeDigitalClaims || 0}`, hint: `${analyticsSummary.trialOrderCount || 0} trial order${analyticsSummary.trialOrderCount === 1 ? '' : 's'}` },
              ].map((card) => (
                <div key={card.label} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">{card.label}</p>
                  <p className="mt-2 text-2xl font-extrabold text-black">{card.value}</p>
                  <p className="mt-2 text-xs text-gray-500">{card.hint}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Sales Breakdown</p>
                    <h3 className="text-lg font-extrabold mt-1">Where revenue is coming from</h3>
                  </div>
                  <p className="text-xs font-bold text-gray-500">Paid orders and bookings</p>
                </div>
                <div className="space-y-3">
                  {analyticsBreakdown.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-sm text-black">{item.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-sm text-black">{formatMoney(item.amount)}</p>
                          <p className="text-xs text-gray-500">{item.count || 0} item{item.count === 1 ? '' : 's'} • {item.share || 0}%</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white">
                        <div className="h-full rounded-full bg-black" style={{ width: `${Math.max(item.share || 0, item.amount > 0 ? 6 : 0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Operational Snapshot</p>
                  <h3 className="text-lg font-extrabold mt-1">Quick totals for daily decisions</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {[
                    { label: 'Physical Products', value: formatMoney(analyticsSummary.physicalProductRevenue) },
                    { label: 'Digital Products', value: formatMoney(analyticsSummary.digitalProductRevenue) },
                    { label: 'Training Revenue', value: formatMoney(analyticsSummary.trainingRevenue) },
                    { label: 'Consultation Revenue', value: formatMoney(analyticsSummary.consultationRevenue) },
                    { label: 'Delivery Fees', value: formatMoney(analyticsSummary.deliveryRevenue) },
                    { label: 'Average Order Value', value: formatMoney(analyticsSummary.averageOrderValue) },
                    { label: 'Average Booking Value', value: formatMoney(analyticsSummary.averageBookingValue) },
                    { label: 'Cancelled Orders', value: `${analyticsSummary.cancelledOrderCount || 0}` },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">{metric.label}</p>
                      <p className="mt-1 text-lg font-extrabold text-black">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Page Sources</p>
                  <h3 className="text-lg font-extrabold mt-1">Which pages started the sales</h3>
                </div>
                <div className="space-y-3">
                  {analyticsPageBreakdown.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-sm text-black">{item.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-sm text-black">{formatMoney(item.amount)}</p>
                          <p className="text-xs text-gray-500">{item.count || 0} sale{item.count === 1 ? '' : 's'} • {item.share || 0}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Campaign Sources</p>
                  <h3 className="text-lg font-extrabold mt-1">Which UTM campaigns or channels converted</h3>
                </div>
                <div className="space-y-3">
                  {analyticsCampaignBreakdown.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-sm text-black">{item.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-sm text-black">{formatMoney(item.amount)}</p>
                          <p className="text-xs text-gray-500">{item.count || 0} sale{item.count === 1 ? '' : 's'} • {item.share || 0}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Monthly Revenue</p>
                  <h3 className="text-lg font-extrabold mt-1">Last six months</h3>
                </div>
                <div className="space-y-3">
                  {analyticsMonthlyRevenue.map((item) => {
                    const maxAmount = Math.max(...analyticsMonthlyRevenue.map((entry) => entry.amount || 0), 1);
                    return (
                      <div key={item.key}>
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className="text-sm font-bold text-black">{item.label}</p>
                          <p className="text-xs font-bold text-gray-500">{formatMoney(item.amount)}</p>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#FDC700]"
                            style={{ width: `${Math.max(((item.amount || 0) / maxAmount) * 100, item.amount > 0 ? 8 : 0)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{item.orders || 0} orders • {item.bookings || 0} bookings</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Recent Sales</p>
                  <h3 className="text-lg font-extrabold mt-1">Latest paid activity</h3>
                </div>
                <div className="space-y-3">
                  {analyticsRecentSales.map((sale) => (
                    <div key={`${sale.type}-${sale.id}`} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-extrabold text-sm text-black line-clamp-1">{sale.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{sale.source} • {sale.customerName}</p>
                          {sale.sourcePage && <p className="text-xs text-gray-400 mt-1">Origin: {sale.sourcePage}</p>}
                          {sale.utmCampaign && <p className="text-xs text-gray-400 mt-1">Campaign: {sale.utmCampaign}</p>}
                          <p className="text-xs text-gray-400 mt-1">{formatAdminDate(sale.createdAt)}</p>
                        </div>
                        <p className="font-extrabold text-sm text-black shrink-0">{formatMoney(sale.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Best Sellers By Month</p>
                  <h3 className="text-lg font-extrabold mt-1">Top earners across the latest monthly windows</h3>
                </div>
                <div className="grid gap-3 xl:grid-cols-3">
                  {analyticsBestSellerMonths.map((window) => (
                    <div key={window.key} className="rounded-3xl border border-gray-100 bg-[#fcfbf7] p-3">
                      <div className="mb-3">
                        <p className="text-sm font-extrabold text-black">{window.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{window.periodLabel}</p>
                      </div>
                      <div className="space-y-3">
                        {(window.groups || []).map((group) => {
                          const topItem = group.topItems?.[0] || null;
                          return (
                            <div key={`${window.key}-${group.key}`} className="rounded-2xl border border-white bg-white px-3 py-2.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">{group.label}</p>
                                  {topItem ? (
                                    <>
                                      <p className="mt-1 text-sm font-extrabold text-black line-clamp-1">{topItem.label}</p>
                                      <p className="mt-1 text-xs text-gray-500">
                                        {pluralize(topItem.units, group.unitLabel)} / {pluralize(topItem.count, 'sale')}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="mt-1 text-xs text-gray-500">No paid sales captured in this window.</p>
                                  )}
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-extrabold text-black">{formatMoney(group.amount)}</p>
                                  <p className="mt-1 text-xs text-gray-500">{pluralize(group.count, 'sale')}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a7a00]">Previous Week Best Sellers</p>
                  <h3 className="text-lg font-extrabold mt-1">Top performers for the last completed 7 days</h3>
                  {analyticsPreviousWeekBestSellers?.periodLabel && (
                    <p className="text-xs text-gray-500 mt-1">{analyticsPreviousWeekBestSellers.periodLabel}</p>
                  )}
                </div>
                <div className="space-y-3">
                  {(analyticsPreviousWeekBestSellers?.groups || []).map((group) => (
                    <div key={`previous-week-${group.key}`} className="rounded-2xl border border-gray-100 bg-[#fcfbf7] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-sm text-black">{group.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{group.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-sm text-black">{formatMoney(group.amount)}</p>
                          <p className="text-xs text-gray-500">
                            {pluralize(group.units, group.unitLabel)} / {pluralize(group.count, 'sale')}
                          </p>
                        </div>
                      </div>
                      {group.topItems?.length ? (
                        <div className="mt-3 space-y-2">
                          {group.topItems.map((item, index) => (
                            <div key={`${group.key}-${item.key}`} className="flex items-start justify-between gap-3 rounded-xl border border-white bg-white px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-black line-clamp-1">{index + 1}. {item.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {pluralize(item.units, group.unitLabel)} / {pluralize(item.count, 'sale')}
                                </p>
                              </div>
                              <p className="shrink-0 text-sm font-extrabold text-black">{formatMoney(item.amount)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-gray-500">No paid sales landed in this revenue source during that period.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>}

        {/* ── DATA GRID ───────────────────────────────────────────────────────── */}
        {!loading && tab !== 'Analytics' && (
          <>
          <div className={collectionLayoutClass}>

            {/* PRODUCTS */}
            {tab === 'Products' && pagedData.map(item => (
              <div key={item._id} className={`bg-white rounded-2xl border border-gray-100 ${useGridCards ? 'p-4 flex flex-col h-full' : 'p-3 flex gap-3'}`}>
                <div className={`${useGridCards ? 'w-full aspect-[4/3] mb-3' : 'w-16 h-16 shrink-0'} rounded-xl overflow-hidden bg-gray-100`}>
                  {item.images?.[0] && <img src={item.images[0]} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.category}</p>
                  <p className="text-sm font-bold">GHS {item.retailPrice?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Stock: {item.stock ?? '∞'}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {item.featured     && <span className="text-xs bg-yellow-50 text-yellow-600 font-bold px-1.5 py-0.5 rounded-full">Featured</span>}
                    {item.fastSelling  && <span className="text-xs bg-red-50 text-red-500 font-bold px-1.5 py-0.5 rounded-full">Fast</span>}
                    {item.isPreOrder   && <span className="text-xs bg-blue-50 text-blue-500 font-bold px-1.5 py-0.5 rounded-full">Pre-Order</span>}
                    {item.discount?.active && <span className="text-xs bg-green-50 text-green-600 font-bold px-1.5 py-0.5 rounded-full">Discount</span>}
                  </div>
                </div>
                <div className={`${useGridCards ? 'mt-3 pt-3 border-t border-gray-100 flex items-center justify-between' : 'flex flex-col items-center gap-2 shrink-0'}`}>
                  <button title={item.available ? 'Hide product' : 'Show product'} aria-label={item.available ? 'Hide product' : 'Show product'} onClick={() => toggle(item._id)} className={item.available?'text-green-500':'text-gray-300'}>{item.available?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                  <button title="Edit product" aria-label="Edit product" onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button title="Delete product" aria-label="Delete product" onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}

            {tab === 'Digital Products' && pagedData
              .filter(item => !(showForm && editId && item._id === editId))
              .map(item => (
              <div key={item._id} className={`bg-white rounded-2xl border border-gray-100 ${useGridCards ? 'p-4 flex flex-col h-full' : 'p-3 flex gap-3'}`}>
                <div className={`${useGridCards ? 'w-full aspect-[4/3] mb-3' : 'w-16 h-16 shrink-0'} rounded-xl overflow-hidden bg-gray-100`}>
                  {item.images?.[0] && <img src={item.images[0]} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{item.digitalType || 'digital product'}</p>
                  <p className="text-sm font-bold">
                    {item.digitalAccessKind === 'free'
                      ? 'Free'
                      : item.digitalAccessKind === 'trial'
                        ? `${item.freeTrialDays || 7}-day trial then GHS ${item.retailPrice?.toLocaleString()}`
                        : `GHS ${item.retailPrice?.toLocaleString()}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.digitalModules?.length || 0} module{item.digitalModules?.length === 1 ? '' : 's'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(item.digitalModules || []).reduce((sum, module) => sum + (module.items?.length || 0), 0)} lesson item{(item.digitalModules || []).reduce((sum, module) => sum + (module.items?.length || 0), 0) === 1 ? '' : 's'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {item.digitalSkillLevel && <span className="text-xs bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded-full">{getDigitalOptionLabel(digitalSkillLevelOptions, item.digitalSkillLevel, 'All Levels')}</span>}
                    {item.digitalFormat && <span className="text-xs bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded-full">{getDigitalOptionLabel(digitalFormatOptions, item.digitalFormat)}</span>}
                    {item.digitalDuration && <span className="text-xs bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded-full">{getDigitalOptionLabel(digitalDurationOptions, item.digitalDuration)}</span>}
                    {item.digitalAccessKind === 'free' && <span className="text-xs bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.5 rounded-full">Free</span>}
                    {item.digitalAccessKind === 'trial' && <span className="text-xs bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">Trial</span>}
                    {item.isSeries && <span className="text-xs bg-purple-50 text-purple-600 font-bold px-1.5 py-0.5 rounded-full">Series</span>}
                    {item.isCertified && <span className="text-xs bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">Certified</span>}
                    {item.featured && <span className="text-xs bg-yellow-50 text-yellow-600 font-bold px-1.5 py-0.5 rounded-full">Featured</span>}
                    {item.fastSelling && <span className="text-xs bg-red-50 text-red-500 font-bold px-1.5 py-0.5 rounded-full">Fast</span>}
                    {item.discount?.active && <span className="text-xs bg-green-50 text-green-600 font-bold px-1.5 py-0.5 rounded-full">Discount</span>}
                    {item.available ? <span className="text-xs bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">Live</span> : <span className="text-xs bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded-full">Hidden</span>}
                  </div>
                </div>
                <div className={`${useGridCards ? 'mt-3 pt-3 border-t border-gray-100 flex items-center justify-between' : 'flex flex-col items-center gap-2 shrink-0'}`}>
                  <button title={item.available ? 'Hide digital product' : 'Show digital product'} aria-label={item.available ? 'Hide digital product' : 'Show digital product'} onClick={() => toggle(item._id)} className={item.available?'text-green-500':'text-gray-300'}>{item.available?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                  <button title="Edit digital product" aria-label="Edit digital product" onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button title="Delete digital product" aria-label="Delete digital product" onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}

            {tab === 'Certificates' && pagedData.map(item => {
              const statusStyles = {
                pending: 'bg-amber-100 text-amber-700',
                generated: 'bg-green-100 text-green-700',
                declined: 'bg-red-100 text-red-700',
              };
              const completion = item.completionSnapshot || {};
              const certificateIssued = isCertificateIssued(item);
              const canUseGeneratedActions = item.status === 'generated';
              const generationChoiceMade = inferCertificateGenerationChoice(item);
              return (
                <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusStyles[item.status] || 'bg-gray-100 text-gray-600'}`}>
                          {(item.status || 'pending').toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {item.type === 'digital_request' ? 'DIGITAL REQUEST' : 'MANUAL'}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          generationChoiceMade === false
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : item.generationMode === 'template'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {formatCertificateGenerationMode(item.generationMode, generationChoiceMade)}
                        </span>
                        {item.certificateNumber && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fcfbf7] text-[#9a7a00] border border-[#FDC700]/30">
                            {item.certificateNumber}
                          </span>
                        )}
                      </div>
                      <p className="font-extrabold text-sm">{item.learnerName}</p>
                      {item.status === 'generated' && (
                        <div className={`mt-1 flex flex-wrap items-center gap-1.5 text-xs font-bold ${
                          isCertificateIssued(item)
                            ? 'text-green-600'
                            : item.emailStatus === 'failed'
                              ? 'text-red-500'
                              : 'text-gray-500'
                        }`}>
                          {isCertificateIssued(item)
                            ? <CheckCircle size={13} />
                            : item.emailStatus === 'failed'
                              ? <AlertCircle size={13} />
                              : <Circle size={13} />}
                          <span>{formatCertificateEmailStatus(item)}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {[item.learnerEmail, item.learnerPhone].filter(Boolean).join(' • ') || 'No learner contact added yet'}
                      </p>
                      <p className="text-sm font-bold text-gray-700 mt-2">{item.certificateTitle || item.productName || 'Certificate'}</p>
                      {item.certificateSubtitle && <p className="text-xs text-gray-500 mt-0.5">{item.certificateSubtitle}</p>}
                      {item.productName && <p className="text-xs text-gray-500 mt-2">Programme: {item.productName}</p>}
                      {item.templateName && (
                        <p className="text-xs text-gray-500 mt-1">Template: {item.templateName}</p>
                      )}
                      {item.type === 'digital_request' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Completion: {completion.completedModules || 0}/{completion.totalModules || 0} modules ({completion.percent || 0}%)
                        </p>
                      )}
                      {item.requestNotes && (
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                          Learner note: {item.requestNotes}
                        </p>
                      )}
                      {item.organizerName && <p className="text-xs text-gray-500 mt-1">Organizer: {item.organizerName}</p>}
                      {!!item.sponsors?.length && <p className="text-xs text-gray-500 mt-1">Sponsors: {item.sponsors.join(', ')}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: item.primaryColor || '#111827' }} />
                        <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: item.accentColor || '#FDC700' }} />
                        <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: item.backgroundColor || '#FFFDF7' }} />
                        <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: item.fontColor || '#374151' }} />
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.16em]">{getCertificateLayoutLabel(item.frameStyle || 'classic')}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">{CERTIFICATE_FONTS.find(option => option.value === (item.fontFamily || 'classic_serif'))?.label || 'Classic Serif'}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Requested {item.requestedAt ? new Date(item.requestedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A'}
                        {item.issueDate ? ` • Issue date ${new Date(item.issueDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 shrink-0">
                      <div
                        title={certificateIssued ? 'Certificate issued to learner' : 'Certificate not yet marked as issued'}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${
                          certificateIssued
                            ? 'border-green-200 bg-green-50 text-green-600'
                            : 'border-gray-200 bg-gray-50 text-gray-400'
                        }`}
                      >
                        {certificateIssued ? <CheckCircle size={15} /> : <Circle size={15} />}
                      </div>
                      <button
                        title="Edit certificate"
                        onClick={() => openEdit(item)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-black hover:text-black"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        title="Choose or apply template"
                        onClick={() => openCertificateTemplateSelectorFromCard(item)}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border ${
                          generationChoiceMade === false
                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300'
                            : item.generationMode === 'template'
                              ? 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300'
                              : 'border-gray-200 text-gray-500 hover:border-black hover:text-black'
                        }`}
                      >
                        <FileText size={15} />
                      </button>
                      <button
                        title="Preview certificate"
                        onClick={() => generateCertificate(item, { autoPrint: false })}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-black hover:text-black"
                      >
                        <Award size={15} />
                      </button>
                      <button
                        title={canUseGeneratedActions ? 'Download certificate PDF' : 'Generate the certificate before downloading'}
                        onClick={() => canUseGeneratedActions && downloadCertificatePdf(item)}
                        disabled={!canUseGeneratedActions || certificateBusy === `download-${item._id}`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-black hover:text-black disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                      >
                        {certificateBusy === `download-${item._id}` ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                      </button>
                      <button
                        title={canUseGeneratedActions ? 'Share certificate on WhatsApp' : 'Generate the certificate before sharing on WhatsApp'}
                        onClick={() => canUseGeneratedActions && shareCertificateWhatsApp(item)}
                        disabled={!canUseGeneratedActions || certificateBusy === `whatsapp-${item._id}`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-black hover:text-black disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                      >
                        {certificateBusy === `whatsapp-${item._id}` ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                      </button>
                      <button
                        title={canUseGeneratedActions ? 'Send certificate by email' : 'Generate the certificate before emailing it'}
                        onClick={() => canUseGeneratedActions && sendCertificateEmail(item)}
                        disabled={!canUseGeneratedActions || certificateBusy === `email-${item._id}`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-black hover:text-black disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                      >
                        {certificateBusy === `email-${item._id}` ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                      </button>
                      <button
                        title="Delete certificate record"
                        onClick={() => del(item._id)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* TRAINING */}
            {tab === 'Training' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-sm">{item.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.active ? 'PUBLIC' : 'HIDDEN'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{item.date} — {item.venue}</p>
                  {!!item.partners?.length && <p className="text-xs text-gray-500">Partners: {item.partners.join(', ')}</p>}
                  {!!item.sponsors?.length && <p className="text-xs text-gray-500">Sponsors: {item.sponsors.join(', ')}</p>}
                  <p className="font-bold text-sm">GHS {item.price?.toLocaleString()}</p>
                </div>
                <button title={item.active ? 'Hide training' : 'Show training'} aria-label={item.active ? 'Hide training' : 'Show training'} onClick={() => toggle(item._id)} className={item.active?'text-green-500':'text-gray-300'}>{item.active?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                <button title="Edit training" aria-label="Edit training" onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                <button title="Delete training" aria-label="Delete training" onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            ))}

            {/* DELIVERY */}
            {tab === 'Delivery' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100 flex justify-between items-center">
                <div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-400">GHS {item.fee?.toLocaleString()}</p></div>
                <div className="flex gap-2">
                  <button title="Edit delivery zone" aria-label="Edit delivery zone" onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button title="Delete delivery zone" aria-label="Delete delivery zone" onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}

            {/* ORDERS */}
            {tab === 'Orders' && pagedData.filter(item => !customerSearch || item.customer?.name?.toLowerCase().includes(customerSearch.toLowerCase()) || item.customer?.phone?.includes(customerSearch)).map(item => {
              const STATUS_OPTS   = ['new','processing','delivery-ongoing','delivered','cancelled'];
              const STATUS_COLORS = { new:'bg-blue-100 text-blue-700', processing:'bg-yellow-100 text-yellow-700', 'delivery-ongoing':'bg-orange-100 text-orange-700', delivered:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-700' };
              const orderWhatsappLink = buildWhatsAppAdminLink(
                item.customer?.phone || '',
                `Hi ${item.customer?.name || 'there'}! Your Belle Kreyashon order ${item.orderId} status has been updated. Please contact us for details.`
              );
              const updateStatus  = async (id, status) => {
                try {
                  const { data: updated } = await api.patch(`/api/orders/${id}/status`, { status }, auth);
                  setData(d => d.map(x => x._id === id ? updated : x));
                } catch { alert('Failed to update status'); }
              };
              return (
                <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-extrabold text-[#FDC700] text-sm">{item.orderId}</p>
                      <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                      <p className="font-bold text-sm mt-1">{item.customer?.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">📞 {item.customer?.phone}</p>
                      {item.customer?.address && item.customer.address !== 'PICKUP' && <p className="text-xs text-gray-400">📍 {item.customer.address}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold">GHS {item.total?.toLocaleString()}</p>
                      <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full capitalize">{item.fulfillment}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-2 mb-3">
                    {item.items?.map((x,i) => <div key={i}>{x.name}{x.variant ? ` (${x.variant})` : ''} × {x.qty} — GHS {x.price}</div>)}
                    <div className="font-bold text-black mt-1">Total: GHS {item.total?.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-500">Status:</span>
                    {STATUS_OPTS.map(s => (
                      <button key={s} onClick={() => updateStatus(item._id, s)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border-2 transition-all capitalize ${item.status === s ? STATUS_COLORS[s] + ' border-transparent' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}>
                        {s.replace('-',' ')}
                      </button>
                    ))}
                    {orderWhatsappLink ? (
                      <a href={orderWhatsappLink}
                        target="_blank" rel="noopener noreferrer"
                        className="ml-auto text-xs bg-green-500 text-white font-bold px-3 py-1 rounded-full hover:bg-green-600">Notify</a>
                    ) : (
                      <span className="ml-auto text-[11px] font-bold text-gray-300">No WhatsApp</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* ABANDONED */}
            {tab === 'Abandoned' && pagedData.map(item => {
              const abandonedWhatsappLink = buildWhatsAppAdminLink(
                item.phone || '',
                `Hi ${item.name || 'there'}! We noticed you left items in your cart at Belle Kreyashon. Can we help?`
              );

              return (
              <div key={item._id} className={`bg-white rounded-2xl p-4 border flex gap-3 ${item.followedUp?'border-green-200 opacity-70':'border-gray-100'}`}>
                <AlertCircle size={18} className={item.followedUp?'text-green-500 shrink-0 mt-0.5':'text-yellow-500 shrink-0 mt-0.5'} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.phone}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.items?.map(i => `${i.name} x${i.qty}`).join(', ')}</p>
                  <p className="text-xs text-gray-400">{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => toggle(item._id, '/api/orders/abandoned')}
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-all ${item.followedUp?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500 hover:bg-green-50'}`}>
                    {item.followedUp ? <CheckCircle size={13}/> : <Circle size={13}/>} {item.followedUp?'Done':'Pending'}
                  </button>
                  {abandonedWhatsappLink ? (
                    <a href={abandonedWhatsappLink}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs bg-green-500 text-white font-bold px-2 py-1 rounded-lg text-center">WA</a>
                  ) : (
                    <span className="text-[11px] text-center font-bold text-gray-300 px-2 py-1">No WA</span>
                  )}
                </div>
              </div>
            )})}

            {/* CONSULTATIONS */}
            {tab === 'Consultations' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-extrabold text-sm">{item.title}</p>
                  {item.duration && <p className="text-xs text-gray-400">{item.duration}</p>}
                  {item.validity && <p className="text-xs text-gray-400">{item.validity}</p>}
                  <p className="font-bold text-sm mt-0.5">{item.isFree ? 'Free' : `GHS ${item.price?.toLocaleString()}`}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.desc}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button title={item.active ? 'Hide blog post' : 'Show blog post'} aria-label={item.active ? 'Hide blog post' : 'Show blog post'} onClick={() => toggle(item._id)} className={item.active?'text-green-500':'text-gray-300'}>{item.active?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                  <button title="Edit blog post" aria-label="Edit blog post" onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button title="Delete blog post" aria-label="Delete blog post" onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}

            {/* BLOG */}
            {tab === 'Blog' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {item.coverImage && <img src={item.coverImage} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display='none';}} />}
                  {item.videoUrl && <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"><Play size={16} className="text-white ml-0.5" /></div></div>}
                </div>
                <div className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-extrabold text-sm line-clamp-2 flex-1 mr-2">{item.title}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${item.published?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{item.published?'Live':'Draft'}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{new Date(item.createdAt).toLocaleDateString()}</p>
                  <div className="flex gap-2">
                    <button onClick={() => toggle(item._id)} className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-gray-100 hover:bg-black hover:text-white transition-all">{item.published?'Unpublish':'Publish'}</button>
                    <button title="Edit consultation" aria-label="Edit consultation" onClick={() => openEdit(item)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 hover:bg-black hover:text-white transition-all"><Pencil size={13}/></button>
                    <button title="Delete consultation" aria-label="Delete consultation" onClick={() => del(item._id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            ))}

            {/* FEATURED */}
            {tab === 'Featured' && pagedData.map(item => {
              const expired = item.partnerSubEnd && new Date(item.partnerSubEnd) < new Date();
              return (
                <div key={item._id} className={`bg-white rounded-2xl border ${useGridCards ? 'p-4 flex flex-col h-full' : 'p-3 flex gap-3'} ${expired?'border-red-200 opacity-60':'border-gray-100'}`}>
                  <div className={`${useGridCards ? 'w-full aspect-[4/3] mb-3' : 'w-14 h-14 shrink-0'} rounded-xl overflow-hidden bg-gray-100`}>
                    {item.images?.[0] && <img src={item.images[0]} alt="" className="w-full h-full object-cover" onError={e=>{e.target.style.display='none';}} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.category}</p>
                    <p className="text-xs font-bold">GHS {item.retailPrice?.toLocaleString()}</p>
                    {item.partnerBrand && <p className="text-xs text-blue-600">Partner: {item.partnerBrand}</p>}
                    <p className="text-xs text-gray-400">Stock: {item.stock ?? '∞'}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.partnerPlanMonths && <span className="text-xs bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded-full">{item.partnerPlanMonths}mo plan</span>}
                      {item.partnerSubEnd    && <span className="text-xs text-gray-400">Ends: {new Date(item.partnerSubEnd).toLocaleDateString()}</span>}
                      {expired              && <span className="text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">Expired</span>}
                    </div>
                  </div>
                  <div className={`${useGridCards ? 'mt-3 pt-3 border-t border-gray-100 flex items-center justify-between' : 'flex flex-col gap-2 shrink-0'}`}>
                    <button title={item.available ? 'Hide featured product' : 'Show featured product'} aria-label={item.available ? 'Hide featured product' : 'Show featured product'} onClick={() => toggle(item._id)} className={item.available?'text-green-500':'text-gray-300'}>{item.available?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                    <button title="Edit featured product" aria-label="Edit featured product" onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                    <button title="Delete featured product" aria-label="Delete featured product" onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                </div>
              );
            })}

            {/* BOOKINGS */}
            {tab === 'Bookings' && pagedData.map(item => {
              const bookingWhatsappLink = buildWhatsAppAdminLink(
                item.customer?.phone || '',
                `Hi ${item.customer?.name || 'there'}! Your Belle Kreyashon booking ${item.bookingId} has been confirmed. We will contact you with further details soon.`
              );

              return (
              <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-extrabold text-[#FDC700] text-sm">{item.bookingId}</p>
                    <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                    <p className="font-bold text-sm mt-1">{item.customer?.name}</p>
                    <p className="text-xs text-gray-400">📞 {item.customer?.phone}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.type === 'training' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {item.type === 'training' ? '🎓 Training' : '💬 Consultation'}
                    </span>
                    <p className="font-extrabold mt-1">GHS {item.amount?.toLocaleString()}</p>
                    <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Paid ✅</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 border-t border-gray-100 pt-2">
                  {item.trainingTitle     && <p>Session: <span className="font-bold">{item.trainingTitle}</span></p>}
                  {item.consultationTitle && <p>Consultation: <span className="font-bold">{item.consultationTitle}</span></p>}
                  {item.notes             && <p className="mt-1 text-gray-400">Notes: {item.notes}</p>}
                  <p className="mt-1 text-gray-400">Ref: {item.paymentRef}</p>
                </div>
                {bookingWhatsappLink ? (
                  <a href={bookingWhatsappLink}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs bg-green-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-green-600">
                    WhatsApp Customer
                  </a>
                ) : (
                  <span className="mt-2 inline-flex text-[11px] font-bold text-gray-300">No WhatsApp number</span>
                )}
              </div>
            )})}

            {/* CUSTOMERS */}
            {tab === 'Customers' && pagedData.map(item => {
              const customerWhatsappLink = buildWhatsAppAdminLink(
                item.phone || '',
                `Hi ${item.name || 'there'}! This is Belle Kreyashon support reaching out about your customer account.`
              );
              const customerSummary = item.summary || {};
              const customerStatusTone = item.hasPassword ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100';
              const verificationTone = item.emailVerified ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-100 text-gray-600 border border-gray-200';

              return (
                <div key={item.id || item.customerId} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {item.customerId && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fcfbf7] text-[#9a7a00] border border-[#FDC700]/30">
                            {item.customerId}
                          </span>
                        )}
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${verificationTone}`}>
                          {item.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${customerStatusTone}`}>
                          {item.hasPassword ? 'Account Ready' : 'No Password Yet'}
                        </span>
                      </div>

                      <p className="font-extrabold text-sm text-black">{item.name || 'Unnamed customer'}</p>
                      <p className="mt-1 text-xs text-gray-400 break-words">
                        {[item.email, item.phone].filter(Boolean).join(' • ') || 'No customer contact saved yet'}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        Joined {formatAdminDate(item.createdAt) || 'N/A'}
                        {item.lastLoginAt ? ` • Last login ${formatAdminDate(item.lastLoginAt)}` : ' • Has not signed in yet'}
                      </p>
                      {customerSummary.lastActivityAt && (
                        <p className="mt-1 text-xs text-gray-500">
                          Latest activity {formatAdminDate(customerSummary.lastActivityAt)}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Lifetime Value</p>
                      <p className="text-xl font-extrabold text-black">{formatMoney(customerSummary.totalSpent || 0)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-2xl bg-[#fcfbf7] px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Orders</p>
                      <p className="mt-1 text-lg font-extrabold text-black">{customerSummary.orderCount || 0}</p>
                    </div>
                    <div className="rounded-2xl bg-[#fcfbf7] px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Bookings</p>
                      <p className="mt-1 text-lg font-extrabold text-black">{customerSummary.bookingCount || 0}</p>
                    </div>
                    <div className="rounded-2xl bg-[#fcfbf7] px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Library</p>
                      <p className="mt-1 text-lg font-extrabold text-black">{customerSummary.digitalProductCount || 0}</p>
                    </div>
                    <div className="rounded-2xl bg-[#fcfbf7] px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Active</p>
                      <p className="mt-1 text-lg font-extrabold text-black">{customerSummary.activeDigitalCount || 0}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>Last order: {formatAdminDate(customerSummary.lastOrderAt) || 'None yet'}</span>
                    <span>•</span>
                    <span>Last booking: {formatAdminDate(customerSummary.lastBookingAt) || 'None yet'}</span>
                    <span>•</span>
                    <span>Last library activity: {formatAdminDate(customerSummary.lastDigitalAccessAt) || 'None yet'}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.email ? (
                      <a
                        href={`mailto:${item.email}`}
                        className="inline-flex items-center gap-1 rounded-full bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-900"
                      >
                        <Mail size={13} />
                        Email
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-400">
                        No email saved
                      </span>
                    )}
                    {customerWhatsappLink ? (
                      <a
                        href={customerWhatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600"
                      >
                        <MessageCircle size={13} />
                        WhatsApp
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-bold text-gray-400">
                        No WhatsApp number
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* INVOICE */}
            {tab === 'Invoice' && <InvoiceCreator auth={auth} />}

            {/* Empty state */}
            {tab !== 'Invoice' && data.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400">No {tab.toLowerCase()} yet.</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">Prev</button>
              <span className="text-xs text-gray-500 font-bold">{page} / {totalPages} ({data.length} total)</span>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-gray-200 hover:border-black disabled:opacity-40">Next</button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
