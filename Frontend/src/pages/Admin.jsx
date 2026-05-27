import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../hooks/useApi';
import { Plus, Pencil, Trash2, Eye, EyeOff, LogOut, Search, AlertCircle, X, CheckCircle, Circle, FileText, Play, Upload, ImagePlus, Loader2, Award, Mail, Download, MessageCircle } from 'lucide-react';
import { CATEGORIES, CATEGORY_VALUES } from '../data/categories';
import { generateCertificate } from '../utils/generateCertificate';

const TABS = ['Products','Digital Products','Certificates','Training','Delivery','Orders','Bookings','Abandoned','Consultations','Blog','Featured','Invoice'];

const inp = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black transition-all';
const certHelp = 'mt-1 text-[11px] leading-relaxed text-gray-500';

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

const formatAdminDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
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

const EMPTY_PROD = { name:'',desc:'',category:'',images:[],retailPrice:'',wholesalePrice:'',wholesaleMinQty:'',stock:'',isPreOrder:false,preOrderType:'',depositPercent:'',available:true,featured:false,fastSelling:false,hasDiscount:false,discount:{type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:''},isPartner:false,partnerBrand:'',partnerContact:'' };
const EMPTY_DIGITAL = {
  name:'', desc:'', category:'Digital Products', images:[], retailPrice:'', available:true, featured:false, fastSelling:false,
  hasDiscount:false, discount:{type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:''},
  isDigital:true, digitalType:'mixed', accessNote:'', digitalFiles:[],
  digitalAccessKind:'paid', freeTrialDays:'7', isSeries:false, seriesTitle:'', seriesDescription:'',
  isCertified:false, certificateTitle:'', certificateDescription:'',
};
const EMPTY_CERT = {
  type:'manual', status:'generated', digitalAccess:'', productId:'', productName:'', customerId:'',
  learnerName:'', learnerEmail:'', learnerPhone:'', requestedAt:toDateInput(new Date()), requestNotes:'',
  completionSnapshot:{ totalModules:0, completedModules:0, percent:0 },
  certificateTitle:'', certificateSubtitle:'', certificateBody:'', issueDate:toDateInput(new Date()),
  primaryColor:'#111827', accentColor:'#FDC700', backgroundColor:'#FFFDF7', fontColor:'#374151', fontFamily:'classic_serif', frameStyle:'classic',
  organizerName:'Belle Kreyashon', sponsors:'', signatoryOneName:'', signatoryOneRole:'', signatoryTwoName:'', signatoryTwoRole:'',
  notes:'', emailStatus:'unsent', emailSentAt:'', emailError:'',
};
const EMPTY_TRAIN = { title:'',desc:'',date:'',venue:'',price:'',capacity:'',image:'',partners:'',sponsors:'',active:true };
const EMPTY_ZONE  = { name:'', fee:'' };
const EMPTY_CONSULT = { title:'',desc:'',price:'',duration:'',validity:'',isFree:false };
const EMPTY_BLOG = { title:'',excerpt:'',content:'',coverImage:'',videoUrl:'',mediaType:'image',tags:'',published:false };
const EMPTY_FEATURED = { brandName:'',productName:'',desc:'',images:[],contactInfo:'',plan:1,category:'',price:'',stock:'',available:true,featured:true,fastSelling:false,isPreOrder:false,preOrderType:'',depositPercent:'',hasDiscount:false,discount:{type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:''},isPartner:true,partnerContact:'' };

const PLANS = [1,3,6,9,12];
const CERTIFICATE_FRAMES = [
  { value:'classic', label:'Classic frame' },
  { value:'double', label:'Double frame' },
  { value:'soft', label:'Soft rounded' },
  { value:'minimal', label:'Minimal frame' },
];
const CERTIFICATE_FONTS = [
  { value:'classic_serif', label:'Classic Serif' },
  { value:'formal_serif', label:'Formal Serif' },
  { value:'modern_sans', label:'Modern Sans' },
  { value:'executive_sans', label:'Executive Sans' },
];
const TAB_FORM_LABELS = {
  Products: 'Product',
  'Digital Products': 'Digital Product',
  Certificates: 'Certificate',
  Training: 'Training',
  Delivery: 'Delivery',
  Orders: 'Order',
  Bookings: 'Booking',
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
          {files.map((file, idx) => (
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
                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    <span>{file.originalFilename || 'Digital file'}</span>
                    {file.fileKind && <span className="capitalize">{file.fileKind}</span>}
                    {file.bytes > 0 && <span>{formatBytes(file.bytes)}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => remove(idx)}
                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 shrink-0">
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
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
    const refId = 'INV-' + Date.now().toString().slice(-6);
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
  const [tab,     setTab]     = useState('Products');
  const [search,  setSearch]  = useState('');
  const [customCat, setCustomCat] = useState('');

  const [data,    setData]    = useState([]);
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

  const auth = { headers: { Authorization: `Bearer ${token}` } };
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
    Products: '/api/products', 'Digital Products': '/api/products', Certificates: '/api/certificates', Training: '/api/training',
    Delivery: '/api/delivery', Orders: '/api/orders',
    Abandoned: '/api/orders/abandoned', Consultations: '/api/consultation',
    Blog: '/api/blog', Featured: '/api/products', Bookings: '/api/training/bookings',
  };

  const load = useCallback(async (t, s) => {
    if (!token) return;
    setLoading(true);
    setData([]);
    let ep = ENDPOINTS[t];
    if (t === 'Featured') ep = '/api/products?isPartner=true';
    if (t === 'Products') ep = '/api/products?isDigital=false';
    if (t === 'Digital Products') ep = '/api/products?isDigital=true';
    const q = s ? `${ep.includes('?') ? '&' : '?'}search=${encodeURIComponent(s)}` : '';
    try {
      const requests = [api.get(ep + q, auth)];
      if (t === 'Certificates') requests.push(api.get('/api/certificates/templates', auth));
      const [r, templatesResponse] = await Promise.all(requests);
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
        setBulkTemplateId(current => current || templates[0]?._id || '');
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
      setData([]);
      if (t === 'Certificates') setCertificateTemplates([]);
    }
    setLoading(false);
  }, [expireSession, token]);

  useEffect(() => { load(tab, ''); setSearch(''); setShowForm(false); setEditId(null); setPage(1); }, [tab]);

  const getEmptyForm = (t) => {
    const map = { Products: EMPTY_PROD, 'Digital Products': EMPTY_DIGITAL, Certificates: EMPTY_CERT, Training: EMPTY_TRAIN, Delivery: EMPTY_ZONE, Consultations: EMPTY_CONSULT, Blog: EMPTY_BLOG, Featured: EMPTY_FEATURED };
    return { ...(map[t] || {}) };
  };

  const openNew = () => {
    setForm(getEmptyForm(tab));
    setEditId(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (item) => {
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
        discount:        item.discount || { type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:'' },
        variants:        item.variants?.length ? JSON.stringify(item.variants) : '',
      });
    } else if (tab === 'Digital Products') {
      setForm({
        ...item,
        category:        'Digital Products',
        images:          item.images?.length ? item.images : [],
        retailPrice:     item.retailPrice || '',
        available:       item.available !== false,
        featured:        !!item.featured,
        fastSelling:     !!item.fastSelling,
        hasDiscount:     !!item.discount,
        discount:        item.discount || { type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:'' },
        isDigital:       true,
        digitalType:     item.digitalType || 'mixed',
        digitalAccessKind: item.digitalAccessKind || 'paid',
        freeTrialDays:   item.freeTrialDays ? String(item.freeTrialDays) : '7',
        isSeries:        !!item.isSeries,
        seriesTitle:     item.seriesTitle || '',
        seriesDescription: item.seriesDescription || '',
        isCertified:     !!item.isCertified,
        certificateTitle: item.certificateTitle || item.name || '',
        certificateDescription: item.certificateDescription || '',
        accessNote:      item.accessNote || '',
        digitalFiles:    item.digitalFiles?.length ? item.digitalFiles : [],
      });
    } else if (tab === 'Certificates') {
      const signatories = item.signatories || [];
      setForm({
        ...item,
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
      });
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
        discount:       item.discount || { type:'percent',value:'',label:'',limitCustomers:'',startDate:'',endDate:'' },
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => { setShowForm(false); setEditId(null); };

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
      digitalAccessKind,
      freeTrialDays: digitalAccessKind === 'trial' ? Math.max(1, Number(f.freeTrialDays) || 7) : 0,
      isSeries:     !!f.isSeries,
      seriesTitle:  f.isSeries ? (f.seriesTitle || '') : '',
      seriesDescription: f.isSeries ? (f.seriesDescription || '') : '',
      isCertified:  !!f.isCertified,
      certificateTitle: f.isCertified ? (f.certificateTitle || f.name || '') : '',
      certificateDescription: f.isCertified ? (f.certificateDescription || '') : '',
      accessNote:   f.accessNote || '',
      digitalFiles: (f.digitalFiles || []).map(file => ({
        ...file,
        label: file.label || file.originalFilename || 'Digital File',
        stepNumber: file.stepNumber !== '' && file.stepNumber !== undefined && file.stepNumber !== null ? Number(file.stepNumber) : null,
        stepTitle: file.stepTitle || '',
        stepSummary: file.stepSummary || '',
      })),
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

  const save = async () => {
    // For Featured, save via products endpoint (they are products with isPartner flag)
    const ep = tab === 'Featured' || tab === 'Digital Products' ? '/api/products' : ENDPOINTS[tab];
    let body = { ...form };
    if (tab === 'Products')      body = buildProductBody(form);
    if (tab === 'Digital Products') body = buildDigitalBody(form);
    if (tab === 'Certificates')  body = buildCertificateBody(form);
    if (tab === 'Blog')          body = buildBlogBody(form);
    if (tab === 'Training')      body = buildTrainingBody(form);
    if (tab === 'Featured')      body = buildFeaturedBody(form);
    if (tab === 'Delivery')      body = { name: form.name, fee: Number(form.fee) };
    if (tab === 'Consultations') body = { ...form, price: Number(form.price) || 0 };
    try {
      if (editId) await api.put(`${ep}/${editId}`, body, auth);
      else        await api.post(ep, body, auth);
      load(tab, search);
      closeForm();
    } catch (e) { alert(e.response?.data?.message || 'Error saving. Check all required fields.'); }
  };

  const del = async (id) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    const ep = tab === 'Featured' || tab === 'Digital Products' ? '/api/products' : ENDPOINTS[tab];
    await api.delete(`${ep}/${id}`, auth);
    setData(d => d.filter(x => x._id !== id));
  };

  const toggle = async (id, ep) => {
    const endpoint = ep || ((tab === 'Featured' || tab === 'Digital Products') ? '/api/products' : ENDPOINTS[tab]);
    const { data: updated } = await api.patch(`${endpoint}/${id}/toggle`, {}, auth);
    setData(d => d.map(x => x._id === id ? updated : x));
  };

  const sf  = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const sfd = (key, val) => setForm(f => ({ ...f, discount: { ...f.discount, [key]: val } }));

  const saveCertificateTemplate = async () => {
    const templateName = prompt('Template name for bulk certificates');
    if (!templateName?.trim()) return;

    try {
      setCertificateBusy('save-template');
      const payload = {
        ...buildCertificateBody(form),
        name: templateName.trim(),
      };
      await api.post('/api/certificates/templates', payload, auth);
      const { data: templates } = await api.get('/api/certificates/templates', auth);
      setCertificateTemplates(Array.isArray(templates) ? templates : []);
      setBulkTemplateId(current => current || templates?.[0]?._id || '');
      alert('Bulk template saved');
    } catch (e) {
      alert(e.response?.data?.message || 'Could not save bulk template');
    } finally {
      setCertificateBusy('');
    }
  };

  const bulkGenerateFromTemplate = async () => {
    if (!bulkTemplateId) return alert('Select a saved bulk template first');
    if (!bulkLearners.trim()) return alert('Paste at least one learner line first');

    try {
      setCertificateBusy('bulk-generate');
      const { data: created } = await api.post('/api/certificates/bulk-generate', {
        templateId: bulkTemplateId,
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

  const allCats = [...new Set([...CATEGORY_VALUES.filter(v => v !== 'All'), customCat].filter(Boolean))];
  const physicalCats = allCats.filter(c => c !== 'Digital Products');

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

  const pagedData  = data.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white px-4 py-3.5 flex justify-between items-center sticky top-0 z-20">
        <div className="font-extrabold">BELLE <span className="text-[#FDC700]">KREYASHON</span> <span className="text-gray-500 font-normal text-xs ml-1">Admin</span></div>
        <button onClick={logout} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"><LogOut size={14} /> Logout</button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 overflow-x-auto sticky top-12 z-10">
        <div className="flex">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${tab === t ? 'border-[#FDC700] text-black' : 'border-transparent text-gray-400 hover:text-black'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* Search + Add bar */}
        <div className="flex gap-2 mb-5">
          {!['Abandoned','Delivery'].includes(tab) && (
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load(tab, search)}
                placeholder={`Search ${tab.toLowerCase()}...`}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-black" />
            </div>
          )}
          {['Abandoned','Delivery'].includes(tab) && <div className="flex-1" />}
          {!['Orders','Abandoned','Bookings','Invoice'].includes(tab) && (
            <button onClick={openNew} className="flex items-center gap-1 px-4 py-2.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900 shrink-0">
              <Plus size={15} /> Add
            </button>
          )}
          {['Orders','Abandoned'].includes(tab) && search && (
            <button onClick={() => { setSearch(''); load(tab,''); }} className="px-3 py-2.5 bg-gray-100 text-sm font-bold rounded-xl hover:bg-gray-200"><X size={14} /></button>
          )}
          {!['Abandoned','Delivery'].includes(tab) && (
            <button onClick={() => load(tab, search)} className="px-4 py-2.5 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-900 shrink-0">Search</button>
          )}
        </div>

        {/* ── FORM PANEL ─────────────────────────────────────────────────────── */}
        {showForm && !['Orders','Abandoned'].includes(tab) && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold">{editId ? `Edit ${TAB_FORM_LABELS[tab] || tab}` : `New ${TAB_FORM_LABELS[tab] || tab}`}</h3>
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
                    {customCat && <button onClick={() => sf('category',customCat)} className="px-3 py-2 bg-[#FDC700] text-black text-xs font-bold rounded-xl whitespace-nowrap">Use</button>}
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
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Use this form for protected downloads like PDFs, videos, templates, audio files and bundled digital resources. Uploaded files here stay separate from regular shop products.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.name||''} onChange={e => sf('name',e.target.value)} placeholder="Digital product name *" className={inp} />
                  <select value={form.digitalType||'mixed'} onChange={e => sf('digitalType',e.target.value)} className={inp}>
                    <option value="mixed">Mixed digital bundle</option>
                    <option value="document">Document / Ebook</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="template">Template / Toolkit</option>
                    <option value="bundle">Bundle</option>
                    <option value="other">Other</option>
                  </select>
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

                  <ImageUploader
                    images={form.images || []}
                    onChange={urls => sf('images', urls)}
                    uploadEndpoint="/api/products/upload"
                    token={token}
                    maxImages={3}
                  />

                  <DigitalFileUploader
                    files={form.digitalFiles || []}
                    onChange={nextFiles => sf('digitalFiles', nextFiles)}
                    uploadEndpoint="/api/products/upload-digital"
                    token={token}
                    maxFiles={8}
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
                    Each uploaded file can act as the next module, lesson, day, or bundle part. Use the module number and module title fields on every file to control the learning order clearly.
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
                  <div>
                    <select value={form.type||'manual'} onChange={e => sf('type',e.target.value)} className={inp}>
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
                      {CERTIFICATE_FRAMES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <p className={certHelp}>Changes the certificate border style. Choose the look that best fits the programme or sponsor brand.</p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-[#fcfbf7] px-4 py-3 flex items-center gap-3 sm:col-span-2">
                    <div className="flex gap-2">
                      <span className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: form.primaryColor || '#111827' }} />
                      <span className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: form.accentColor || '#FDC700' }} />
                      <span className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: form.backgroundColor || '#FFFDF7' }} />
                      <span className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: form.fontColor || '#374151' }} />
                    </div>
                    <p className="text-xs text-gray-500">
                      Frame: <span className="font-bold text-gray-700">{CERTIFICATE_FRAMES.find(option => option.value === (form.frameStyle || 'classic'))?.label || 'Classic frame'}</span>
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
                </div>

                <div className="grid sm:grid-cols-3 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2">Completion snapshot</p>
                    <div className="space-y-2">
                      <input value={form.completionSnapshot?.totalModules ?? 0} onChange={e => setForm(f => ({ ...f, completionSnapshot: { ...f.completionSnapshot, totalModules: e.target.value } }))} placeholder="Total modules" type="number" className={inp} />
                      <input value={form.completionSnapshot?.completedModules ?? 0} onChange={e => setForm(f => ({ ...f, completionSnapshot: { ...f.completionSnapshot, completedModules: e.target.value } }))} placeholder="Completed modules" type="number" className={inp} />
                      <input value={form.completionSnapshot?.percent ?? 0} onChange={e => setForm(f => ({ ...f, completionSnapshot: { ...f.completionSnapshot, percent: e.target.value } }))} placeholder="Completion %" type="number" className={inp} />
                    </div>
                    <p className={certHelp}>Admin tracking only. Example: `10 total`, `10 completed`, `100%` when a learner finished every module.</p>
                  </div>
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
                </div>

                <div>
                  <textarea value={form.notes||''} onChange={e => sf('notes',e.target.value)} placeholder="Admin notes (optional)" rows={2} className={inp + ' resize-none'} />
                  <p className={certHelp}>Internal only. Example: `Used for May 2026 graduation batch` or `Waiting for sponsor confirmation`.</p>
                </div>

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
                    Save For Bulk
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
                </div>
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
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div>
                <h3 className="font-extrabold">Bulk Certificate Generator</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Save a finished certificate design for bulk use, then paste one learner per line using `Full Name, email, phone` or `Full Name | email | phone`.
                </p>
              </div>
              <p className="text-xs text-gray-400">A4 output • reusable templates • email-ready</p>
            </div>

            <div className="grid lg:grid-cols-[320px_1fr] gap-4">
              <div className="space-y-3">
                <select value={bulkTemplateId} onChange={e => setBulkTemplateId(e.target.value)} className={inp}>
                  <option value="">Select saved template</option>
                  {certificateTemplates.map(template => (
                    <option key={template._id} value={template._id}>{template.name}</option>
                  ))}
                </select>
                {bulkTemplateId && (() => {
                  const selected = certificateTemplates.find(template => template._id === bulkTemplateId);
                  if (!selected) return null;
                      return (
                        <div className="rounded-xl border border-gray-100 bg-[#fcfbf7] px-4 py-3">
                          <p className="text-xs font-bold text-gray-700">{selected.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{selected.certificateTitle || selected.productName || 'Certificate'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: selected.primaryColor || '#111827' }} />
                            <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: selected.accentColor || '#FDC700' }} />
                            <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: selected.backgroundColor || '#FFFDF7' }} />
                            <span className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: selected.fontColor || '#374151' }} />
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.16em]">{selected.frameStyle || 'classic'} frame</span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">{CERTIFICATE_FONTS.find(option => option.value === (selected.fontFamily || 'classic_serif'))?.label || 'Classic Serif'}</p>
                        </div>
                      );
                    })()}
                  </div>

              <div className="space-y-3">
                <textarea
                  value={bulkLearners}
                  onChange={e => setBulkLearners(e.target.value)}
                  placeholder={`Ama Mensah, ama@example.com, 0240000000\nKwame Asare | kwame@example.com | 0550000000\nJoan Doe`}
                  rows={8}
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
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Filter by customer name or phone..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-black" />
              </div>
              {customerSearch && <button onClick={() => setCustomerSearch('')} className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-bold"><X size={13}/></button>}
              <button onClick={() => downloadCSV(data, 'belle-kreyashon-orders.csv')}
                className="px-3 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-900 whitespace-nowrap">↓ Export CSV</button>
            </div>
          </div>
        )}

        {loading && <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>}

        {/* ── DATA GRID ───────────────────────────────────────────────────────── */}
        {!loading && (
          <>
          <div className={tab === 'Products' || tab === 'Digital Products' || tab === 'Featured' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-3' : tab === 'Blog' ? 'grid sm:grid-cols-2 gap-3' : 'flex flex-col gap-3'}>

            {/* PRODUCTS */}
            {tab === 'Products' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-3 border border-gray-100 flex gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
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
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button onClick={() => toggle(item._id)} className={item.available?'text-green-500':'text-gray-300'}>{item.available?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                  <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}

            {tab === 'Digital Products' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-3 border border-gray-100 flex gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
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
                  <p className="text-xs text-gray-400">{item.digitalFiles?.length || 0} secure file{item.digitalFiles?.length === 1 ? '' : 's'}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
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
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button onClick={() => toggle(item._id)} className={item.available?'text-green-500':'text-gray-300'}>{item.available?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                  <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
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
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.16em]">{item.frameStyle || 'classic'} frame</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">{CERTIFICATE_FONTS.find(option => option.value === (item.fontFamily || 'classic_serif'))?.label || 'Classic Serif'}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Requested {item.requestedAt ? new Date(item.requestedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A'}
                        {item.issueDate ? ` • Issue date ${new Date(item.issueDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 shrink-0">
                      {item.status === 'generated' && isCertificateIssued(item) && (
                        <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-green-200 bg-green-50 text-green-600">
                          <CheckCircle size={15} />
                        </div>
                      )}
                      <button onClick={() => openEdit(item)} className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-black hover:text-black">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => generateCertificate(item, { autoPrint: false })}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-black hover:text-black"
                      >
                        <Award size={15} />
                      </button>
                      {item.status === 'generated' && (
                        <button
                          onClick={() => downloadCertificatePdf(item)}
                          disabled={certificateBusy === `download-${item._id}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-black hover:text-black disabled:opacity-60"
                        >
                          {certificateBusy === `download-${item._id}` ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        </button>
                      )}
                      {item.status === 'generated' && (
                        <button
                          onClick={() => shareCertificateWhatsApp(item)}
                          disabled={certificateBusy === `whatsapp-${item._id}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-black hover:text-black disabled:opacity-60"
                        >
                          {certificateBusy === `whatsapp-${item._id}` ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                        </button>
                      )}
                      {item.status === 'generated' && (
                        <button
                          onClick={() => sendCertificateEmail(item)}
                          disabled={certificateBusy === `email-${item._id}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-black hover:text-black disabled:opacity-60"
                        >
                          {certificateBusy === `email-${item._id}` ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                        </button>
                      )}
                      <button onClick={() => del(item._id)} className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500">
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
                <button onClick={() => toggle(item._id)} className={item.active?'text-green-500':'text-gray-300'}>{item.active?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            ))}

            {/* DELIVERY */}
            {tab === 'Delivery' && pagedData.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-4 border border-gray-100 flex justify-between items-center">
                <div><p className="font-bold text-sm">{item.name}</p><p className="text-xs text-gray-400">GHS {item.fee?.toLocaleString()}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}

            {/* ORDERS */}
            {tab === 'Orders' && pagedData.filter(item => !customerSearch || item.customer?.name?.toLowerCase().includes(customerSearch.toLowerCase()) || item.customer?.phone?.includes(customerSearch)).map(item => {
              const STATUS_OPTS   = ['new','processing','delivery-ongoing','delivered','cancelled'];
              const STATUS_COLORS = { new:'bg-blue-100 text-blue-700', processing:'bg-yellow-100 text-yellow-700', 'delivery-ongoing':'bg-orange-100 text-orange-700', delivered:'bg-green-100 text-green-700', cancelled:'bg-red-100 text-red-700' };
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
                    <a href={`https://wa.me/${item.customer?.phone?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent('Hi ' + item.customer?.name + '! Your Belle Kreyashon order ' + item.orderId + ' status has been updated. Please contact us for details.')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="ml-auto text-xs bg-green-500 text-white font-bold px-3 py-1 rounded-full hover:bg-green-600">Notify</a>
                  </div>
                </div>
              );
            })}

            {/* ABANDONED */}
            {tab === 'Abandoned' && pagedData.map(item => (
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
                  <a href={`https://wa.me/${item.phone?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hi ${item.name}! We noticed you left items in your cart at Belle Kreyashon. Can we help?`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-green-500 text-white font-bold px-2 py-1 rounded-lg text-center">WA</a>
                </div>
              </div>
            ))}

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
                  <button onClick={() => toggle(item._id)} className={item.active?'text-green-500':'text-gray-300'}>{item.active?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                  <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                  <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
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
                    <button onClick={() => openEdit(item)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 hover:bg-black hover:text-white transition-all"><Pencil size={13}/></button>
                    <button onClick={() => del(item._id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            ))}

            {/* FEATURED */}
            {tab === 'Featured' && pagedData.map(item => {
              const expired = item.partnerSubEnd && new Date(item.partnerSubEnd) < new Date();
              return (
                <div key={item._id} className={`bg-white rounded-2xl p-3 border flex gap-3 ${expired?'border-red-200 opacity-60':'border-gray-100'}`}>
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
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
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => toggle(item._id)} className={item.available?'text-green-500':'text-gray-300'}>{item.available?<Eye size={16}/>:<EyeOff size={16}/>}</button>
                    <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-black"><Pencil size={16}/></button>
                    <button onClick={() => del(item._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                </div>
              );
            })}

            {/* BOOKINGS */}
            {tab === 'Bookings' && pagedData.map(item => (
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
                <a href={`https://wa.me/${item.customer?.phone?.replace(/[^0-9]/g,'')}?text=${encodeURIComponent('Hi ' + item.customer?.name + '! Your Belle Kreyashon booking ' + item.bookingId + ' has been confirmed. We will contact you with further details soon.')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs bg-green-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-green-600">
                  WhatsApp Customer
                </a>
              </div>
            ))}

            {/* INVOICE */}
            {tab === 'Invoice' && <InvoiceCreator auth={auth} />}

            {/* Empty state */}
            {tab !== 'Invoice' && data.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-400">No {tab.toLowerCase()} yet.</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
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
