
const SUSPICIOUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on(error|load|click|mouseover|focus|blur)\s*=/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
  /expression\s*\(/i,
  /url\s*\(\s*['"]?\s*javascript/i,
  /<!--/,
  /-->/,
];


const SQL_PATTERNS = [
  /(\b)(union\s+select|select\s+.*\s+from|insert\s+into|update\s+.*\s+set|delete\s+from|drop\s+table|alter\s+table)/i,
  /(['";])\s*(or|and)\s+\d+\s*=\s*\d+/i,
  /--\s*$/,
  /\/\*[\s\S]*?\*\//,
];


function sanitizeString(val) {
  if (typeof val !== 'string') return val;

 
  let clean = val.replace(/\0/g, '');


  clean = clean.replace(/<[^>]*>/g, '');

 
  clean = clean.replace(/javascript\s*:/gi, '');
  clean = clean.replace(/vbscript\s*:/gi, '');
  clean = clean.replace(/data\s*:\s*text\/html/gi, '');

  return clean.trim();
}


function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      result[key] = sanitizeString(val);
    } else if (typeof val === 'object' && val !== null) {
      result[key] = sanitizeObject(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}


function isSuspicious(val) {
  if (typeof val !== 'string') return false;
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(val)) return true;
  }
  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(val)) return true;
  }
  return false;
}


export function inputSanitizer(req, res, next) {

  if (req.query) {

    const searchVal = req.query.search || req.query.q || '';
    if (searchVal && isSuspicious(searchVal)) {
      return res.status(400).json({ error: 'Invalid search query' });
    }
    req.query = sanitizeObject(req.query);
  }


  if (req.params) {
    req.params = sanitizeObject(req.params);
  }


  if (req.body && typeof req.body === 'object' && !req.is('multipart/form-data')) {
    req.body = sanitizeObject(req.body);
  }

  next();
}
